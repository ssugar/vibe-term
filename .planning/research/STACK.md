# Stack Research: TUI Process Monitor/HUD

**Project:** Claude Code TUI HUD
**Researched:** 2026-01-22
**Overall Confidence:** HIGH (verified via multiple official sources)

---

## Core Framework

### Ink (React for CLIs)
| Property | Value |
|----------|-------|
| **Package** | `ink` |
| **Version** | 6.6.0 (as of December 2025) |
| **Node.js** | >= 20 |
| **React** | 18.x (Note: React 19 incompatible) |
| **Module** | ESM only |
| **Confidence** | HIGH |

**Why Ink:**
- Claude Code itself is built with Ink - proven for this exact use case
- React mental model transfers directly - no new paradigms to learn
- Component-based architecture enables clean separation of concerns (status panels, navigation, etc.)
- Built-in focus management via `useFocus` and `useFocusManager` hooks - essential for keyboard navigation
- Flexbox layout via Yoga - familiar CSS-like positioning
- Active maintenance by Vadim Demedes and Sindre Sorhus
- Strong TypeScript support out of the box

**What Ink provides:**
- Core components: `<Box>`, `<Text>`, `<Newline>`, `<Spacer>`, `<Static>`, `<Transform>`
- Input handling: `useInput` hook for keyboard events
- Focus system: `useFocus`, `useFocusManager` for keyboard navigation
- Lifecycle: `useApp` for exit handling
- I/O: `useStdin`, `useStdout`, `useStderr`

**Sources:**
- [Ink GitHub](https://github.com/vadimdemedes/ink) - verified v6.6.0
- [Ink Releases](https://github.com/vadimdemedes/ink/releases) - Node.js 20+ requirement

---

## Companion Libraries

### @inkjs/ui - UI Component Library
| Property | Value |
|----------|-------|
| **Package** | `@inkjs/ui` |
| **Version** | Latest (check npm) |
| **Confidence** | HIGH |

**Why @inkjs/ui:**
- Official Ink companion library
- Pre-built components: Spinner, ProgressBar, Select, Badge, StatusMessage, Alert
- Theming support via React context
- Reduces boilerplate for common UI patterns

**Components we'll use:**
- `Spinner` - Loading indicators for process states
- `Badge` - Status indicators (working/idle/blocked)
- `ProgressBar` - Context window usage visualization
- `StatusMessage` - Status with explanations

**Sources:**
- [ink-ui GitHub](https://github.com/vadimdemedes/ink-ui)

---

### Zustand - State Management
| Property | Value |
|----------|-------|
| **Package** | `zustand` |
| **Version** | 5.0.10+ |
| **Confidence** | HIGH |

**Why Zustand (not Context or Redux):**
- Works in Node.js environments (unlike some React state libraries)
- Minimal boilerplate - stores are just functions
- No provider wrapper required
- Subscribable outside React components - useful for background process monitoring
- `zustand-x` extension enables use without React hooks for Node.js workers

**Use cases in this project:**
- Global process state (list of Claude instances, their statuses)
- UI state (focused panel, refresh interval)
- Configuration state (color thresholds, keybindings)

**Sources:**
- [Zustand GitHub](https://github.com/pmndrs/zustand) - v5.0.10
- [Zustand npm](https://www.npmjs.com/package/zustand)

---

## Process Detection

### ps-list - Cross-Platform Process Listing
| Property | Value |
|----------|-------|
| **Package** | `ps-list` |
| **Version** | 9.0.0 |
| **Node.js** | >= 20 |
| **Module** | ESM only |
| **Confidence** | HIGH |

**Why ps-list:**
- By Sindre Sorhus - consistent quality and maintenance
- Cross-platform (macOS, Linux, Windows)
- Returns: pid, name, ppid, cmd, cpu, memory, uid, path, startTime
- Pure JavaScript, no native dependencies
- Promise-based API

**Platform notes:**
- `cmd`, `cpu`, `memory`, `uid`, `path`, `startTime` NOT available on Windows
- On macOS/Linux, `name` truncated to 15 characters (use `cmd` for full command)

**Usage pattern:**
```typescript
import psList from 'ps-list';

const processes = await psList();
const claudeProcesses = processes.filter(p =>
  p.name.includes('claude') || p.cmd?.includes('claude')
);
```

**Sources:**
- [ps-list GitHub](https://github.com/sindresorhus/ps-list)
- [ps-list Releases](https://github.com/sindresorhus/ps-list/releases) - v9.0.0, Node.js 20+

---

### find-process - Process Search by Name/Port
| Property | Value |
|----------|-------|
| **Package** | `find-process` |
| **Version** | Latest |
| **Confidence** | MEDIUM |

**Why find-process (supplementary):**
- Can search by process name, PID, or port
- CLI tool included for testing
- Cross-platform including Android

**When to use:**
- Searching for specific process by name pattern
- Checking if a port is in use
- Supplementary to ps-list for targeted searches

**Note:** Consider using ps-list as primary and filtering in-memory rather than multiple find-process calls.

**Sources:**
- [find-process npm](https://www.npmjs.com/package/find-process)

---

## Terminal Integration

### node-tmux - tmux Session Management
| Property | Value |
|----------|-------|
| **Package** | `node-tmux` |
| **Version** | No formal releases |
| **Confidence** | LOW |

**Why node-tmux (with caveats):**
- Provides tmux session listing and management
- Methods: `listSessions()`, `hasSession()`, `newSession()`, `killSession()`, `writeInput()`
- Validates tmux existence before operations

**Caveats:**
- No formal releases published on GitHub
- Limited recent activity (3 open issues, minimal commits)
- May need fallback to direct tmux CLI commands via execa

**Alternative approach (recommended):**
```typescript
import { execa } from 'execa';

async function listTmuxSessions(): Promise<string[]> {
  try {
    const { stdout } = await execa('tmux', ['list-sessions', '-F', '#{session_name}']);
    return stdout.split('\n').filter(Boolean);
  } catch {
    return []; // tmux not running or not installed
  }
}
```

**Sources:**
- [node-tmux GitHub](https://github.com/StarlaneStudios/node-tmux)

---

### execa - Process Execution
| Property | Value |
|----------|-------|
| **Package** | `execa` |
| **Version** | Latest (9.x) |
| **Module** | ESM only |
| **Confidence** | HIGH |

**Why execa:**
- By Sindre Sorhus - reliable, well-maintained
- Promise-based with clean output handling
- Cross-platform shell command execution
- Automatic newline stripping
- Rich error reporting

**Use cases:**
- Executing tmux commands directly
- Running system commands for process detection fallbacks
- Spawning subprocesses

**Sources:**
- [execa GitHub](https://github.com/sindresorhus/execa)

---

### is-wsl - WSL Detection
| Property | Value |
|----------|-------|
| **Package** | `is-wsl` |
| **Version** | Latest |
| **Confidence** | HIGH |

**Why is-wsl:**
- By Sindre Sorhus
- Detects WSL1 and WSL2 environments
- Essential for platform-specific behavior
- Zero dependencies

**Use cases:**
- Conditional logic for WSL-specific process detection
- Path handling differences in WSL
- Warning users about WSL limitations

**Sources:**
- [is-wsl GitHub](https://github.com/sindresorhus/is-wsl)
- [is-wsl npm](https://www.npmjs.com/package/is-wsl)

---

## Styling

### Chalk - Terminal Colors
| Property | Value |
|----------|-------|
| **Package** | `chalk` |
| **Version** | 5.6.2 |
| **Module** | ESM only (v5+) |
| **Confidence** | HIGH |

**Why Chalk:**
- Industry standard for terminal colors
- Extensive color support (256 colors, truecolor)
- Chainable API: `chalk.red.bold('text')`
- Automatic color detection
- Massive ecosystem (137k+ dependents)

**Note:** Ink's `<Text>` component has built-in color support. Use Chalk for:
- Complex color compositions
- Non-Ink contexts (logging, debugging)
- Color utility functions

**Alternative consideration:**
- `picocolors` is 14x faster and 14x smaller
- Use picocolors if you only need simple, non-chained colors
- Chalk better for complex styling needs

**Sources:**
- [Chalk GitHub](https://github.com/chalk/chalk)
- [Chalk npm](https://www.npmjs.com/package/chalk)

---

## Development Tools

### TypeScript
| Property | Value |
|----------|-------|
| **Package** | `typescript` |
| **Version** | 5.x |
| **Confidence** | HIGH |

**Why TypeScript:**
- Ink has full TypeScript support
- Type safety for complex state management
- Better IDE experience
- create-ink-app scaffolds TypeScript projects

---

### tsx - TypeScript Execution
| Property | Value |
|----------|-------|
| **Package** | `tsx` |
| **Version** | Latest |
| **Confidence** | HIGH |

**Why tsx:**
- Run TypeScript directly without build step
- Fast execution via esbuild
- Useful for development iteration

---

## Recommended Stack Summary

```bash
# Core
npm install ink@6 react@18 @inkjs/ui zustand

# Process detection
npm install ps-list execa is-wsl

# Styling (optional - Ink has built-in colors)
npm install chalk

# Dev dependencies
npm install -D typescript @types/react tsx
```

**package.json engines:**
```json
{
  "type": "module",
  "engines": {
    "node": ">=20"
  }
}
```

---

## NOT Recommended

### blessed / neo-blessed
**Why avoid:**
- Original blessed is unmaintained
- Widget-based paradigm conflicts with React mental model
- neo-blessed forks have limited activity
- Ink is actively maintained and used by major tools

### React 19
**Why avoid (for now):**
- Ink 6.x is incompatible with React 19
- Causes TypeError with ReactCurrentOwner
- Stick with React 18.x until Ink officially supports React 19

### Native process libraries (process-list, node-process-list)
**Why avoid:**
- Require native compilation (node-gyp)
- Cross-platform build issues
- ps-list achieves same results with pure JavaScript

### Old Ink ecosystem packages (ink-spinner, ink-select-input standalone)
**Why prefer @inkjs/ui:**
- Standalone packages may be outdated (ink-spinner v5.0.0 is 3 years old)
- @inkjs/ui provides modern, maintained alternatives
- Consistent theming across components

### CommonJS packages
**Why avoid:**
- Ink 6.x is ESM only
- ps-list 9.x is ESM only
- execa 9.x is ESM only
- Mixing module systems causes import errors

---

## Confidence Notes

| Area | Level | Notes |
|------|-------|-------|
| Ink version/features | HIGH | Verified via GitHub releases |
| ps-list version/requirements | HIGH | Verified via GitHub releases |
| @inkjs/ui components | HIGH | Verified via GitHub README |
| node-tmux reliability | LOW | No releases, limited activity - plan fallback |
| Zustand Node.js usage | MEDIUM | Documented but less common pattern |
| React 19 incompatibility | HIGH | Confirmed via GitHub issue #688 |

**Areas needing validation during implementation:**
1. node-tmux actual behavior - test early, have execa fallback ready
2. ps-list Windows limitations - verify what data is actually available
3. WSL2 process detection - test that WSL processes are visible

---

## Architecture Implications

Based on stack choices:

1. **ESM-only project** - All key dependencies require ESM
2. **Node.js 20+ required** - ps-list 9.x minimum requirement
3. **React 18.x locked** - Cannot upgrade until Ink supports React 19
4. **TypeScript recommended** - Full type support, scaffolding available
5. **tmux integration fragile** - Build with execa fallback, not node-tmux dependency

**Sources:**
- [Ink GitHub](https://github.com/vadimdemedes/ink)
- [ps-list GitHub](https://github.com/sindresorhus/ps-list)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [execa GitHub](https://github.com/sindresorhus/execa)
- [is-wsl GitHub](https://github.com/sindresorhus/is-wsl)
- [Chalk GitHub](https://github.com/chalk/chalk)
- [node-tmux GitHub](https://github.com/StarlaneStudios/node-tmux)
- [ink-ui GitHub](https://github.com/vadimdemedes/ink-ui)

---
---

# v2.0 Stack Additions: tmux-Integrated Architecture

**Researched:** 2026-01-25
**Scope:** Stack additions for tmux-integrated Claude Terminal
**Confidence:** HIGH (tmux CLI patterns are stable, no new dependencies needed)

## Executive Summary

The v2.0 tmux-integrated architecture requires **no new npm dependencies**. The existing stack (Ink 6.x, Zustand, React 19) combined with tmux CLI commands via `execAsync()` provides everything needed. This is the correct approach because:

1. **tmux CLI is the standard** - No Node.js library fully wraps tmux's pane management APIs
2. **Pattern already established** - v1.0 uses `execAsync()` for tmux operations successfully
3. **Complexity avoided** - Libraries like `node-tmux` lack split-window/pane operations; `stmux` is a tmux replacement, not integration

## New Dependencies

**None required.**

| Package | Status | Rationale |
|---------|--------|-----------|
| node-tmux | NOT ADDING | Only supports session-level operations (create/kill/list). Missing: split-window, send-keys, select-pane, resize-pane. Would need CLI fallback anyway. |
| stmux | NOT ADDING | Replaces tmux entirely using node-pty + xterm.js. Contradicts v2.0 goal of native tmux integration. |
| tmuxn | NOT ADDING | Session manager (tmuxinator-style) for YAML configs. Not programmatic pane control. |
| node-pty | NOT ADDING | Embedded terminal approach explicitly out of scope per PROJECT.md. tmux splits are proven reliable. |

## Integration Points

### tmux CLI Commands (via execAsync)

The v2.0 architecture uses these tmux commands, all executed through the existing `execAsync()` pattern in `platform.ts`:

| Command | Purpose | v2.0 Usage |
|---------|---------|------------|
| `tmux new-session -d -s name` | Create detached session | HUD startup: create managed session |
| `tmux split-window -v -l 2` | Horizontal split (top pane) | Create 2-line HUD strip at top |
| `tmux split-window -f -b -l 2` | Full-width split above | Alternative: split above existing content |
| `tmux send-keys -t target 'cmd' C-m` | Run command in pane | Spawn Claude in bottom pane |
| `tmux select-pane -t %id` | Focus specific pane | Switch active pane (bottom sessions) |
| `tmux resize-pane -t %id -y 2` | Resize pane height | Lock HUD strip to 2 lines |
| `tmux display-message -p '#{pane_id}'` | Get current pane ID | Track HUD pane vs session panes |
| `tmux list-panes -F '#{pane_id} #{pane_pid}'` | List panes with PIDs | Map sessions to panes |
| `tmux swap-pane -s %src -t %tgt` | Swap two panes | Instant session switching |
| `tmux respawn-pane -t %id -k 'cmd'` | Kill and restart pane | Replace session in pane |

### Existing Stack Integration

```
src/services/
  platform.ts          # execAsync() - already present, no changes needed
  tmuxService.ts       # Extend with pane management functions

src/components/
  Header.tsx           # Refactor into HudStrip.tsx (horizontal tabs)
  SessionRow.tsx       # Extract compact tab format from row logic

src/stores/
  appStore.ts          # Add: hudPaneId, activePaneId, paneSessionMap
```

### Key Integration Pattern

```typescript
// Extended tmuxService.ts pattern for v2.0
export async function createHudLayout(): Promise<{
  hudPaneId: string;
  sessionPaneId: string;
}> {
  // Split window: HUD at top (2 lines), session below
  // -b creates pane above, -l 2 sets height to 2 lines
  // -P -F prints the new pane ID
  const { stdout: hudPane } = await execAsync(
    `tmux split-window -b -l 2 -P -F '#{pane_id}'`
  );

  // Get the bottom pane ID (original pane, where sessions run)
  const { stdout: sessionPane } = await execAsync(
    `tmux display-message -p '#{pane_id}'`
  );

  return {
    hudPaneId: hudPane.trim(),
    sessionPaneId: sessionPane.trim(),
  };
}

export async function spawnInPane(paneId: string, command: string): Promise<void> {
  // Escape single quotes in command
  const escaped = command.replace(/'/g, "'\\''");
  await execAsync(`tmux send-keys -t ${paneId} '${escaped}' C-m`);
}

export async function focusPane(paneId: string): Promise<void> {
  await execAsync(`tmux select-pane -t ${paneId}`);
}

export async function swapPanes(source: string, target: string): Promise<void> {
  await execAsync(`tmux swap-pane -s ${source} -t ${target}`);
}
```

## Ink Component Patterns for HUD Strip

The existing Ink Box component supports fixed-height horizontal layouts:

```typescript
// HUD strip pattern (1-2 lines, horizontal tabs)
<Box height={2} flexDirection="row" width="100%">
  {sessions.map((session, i) => (
    <SessionTab
      key={session.pid}
      session={session}
      isSelected={i === selectedIndex}
      index={i + 1}
    />
  ))}
</Box>

// Compact tab format per PROJECT.md requirements
// [1:project-name status 25%] [2:other-proj status 67%]
function SessionTab({ session, isSelected, index }: SessionTabProps) {
  const statusChar = STATUS_CHARS[session.status]; // W/B/I/T
  const percent = session.contextUsage ?? 0;
  const name = session.projectName.slice(0, 12);

  return (
    <Box marginRight={1}>
      <Text inverse={isSelected} color={isSelected ? 'cyan' : undefined}>
        [{index}:{name} {statusChar} {percent}%]
      </Text>
    </Box>
  );
}
```

## Alternatives Considered

### node-tmux Library

**Repository:** [StarlaneStudios/node-tmux](https://github.com/StarlaneStudios/node-tmux)
**Why rejected:**
- Only 8 GitHub stars, minimal adoption
- API limited to: `newSession`, `listSessions`, `hasSession`, `killSession`, `renameSession`, `writeInput`
- Missing critical operations: `split-window`, `send-keys -t`, `select-pane`, `resize-pane`, `swap-pane`
- Would require falling back to CLI for all pane operations anyway
- Adds dependency without value

### stmux (Simple Terminal Multiplexer)

**Repository:** [rse/stmux](https://github.com/rse/stmux)
**Why rejected:**
- Replaces tmux entirely (uses node-pty + xterm.js internally)
- Contradicts PROJECT.md: "tmux splits over embedded terminal - Native reliability, less complexity"
- Loses tmux's robust session persistence and recovery
- Different mental model than native tmux (users can't use tmux keybindings)

### tmux Control Mode (-CC)

**What it is:** tmux's machine-readable protocol for GUI integration (used by iTerm2)
**Why not used:**
- Designed for deep GUI integration (terminal emulator building)
- Requires parsing streaming protocol (complex state machine)
- No Node.js library implements the parser
- CLI commands achieve same goals with far less complexity
- Overkill for our needs (we're not building a tmux GUI replacement)

### node-pty (Embedded Terminal)

**Why explicitly out of scope:**
- PROJECT.md: "Embedded terminal (node-pty) -- Using tmux splits instead, proven reliability"
- v1.0 decision: tmux native operations are more reliable than embedding
- Adds complexity: terminal emulation, resize handling, escape sequences
- tmux already does terminal management perfectly

## Critical Constraints

### 1. HUD Must Run Inside tmux

The HUD process itself must be inside the tmux session it manages. This enables:
- `tmux split-window` from HUD to create session pane
- `tmux select-pane` to switch which pane is active
- Shared tmux keybindings (Ctrl+B prefix still works)
- Detection via `process.env.TMUX` already implemented in v1.0

### 2. Pane Size Constraints

The HUD strip should be 2 lines (1 for tabs, 1 for help/status):
```bash
tmux resize-pane -t %hud_pane_id -y 2
```

Session pane gets remaining space. Must handle terminal resize gracefully. Consider `tmux set-hook -g after-resize-pane` for responsive behavior.

### 3. Session Pane Lifecycle

When switching sessions in the bottom pane:
- **Option A:** Single pane, kill/respawn Claude process (simpler, slower switch)
- **Option B:** Hidden panes for each session, swap which is visible (faster switch, more resources)

**Recommendation:** Option B with `swap-pane` for instant switching:
```bash
# Create hidden pane for each session
tmux split-window -d -P -F '#{pane_id}' 'claude --project /path'

# Swap visible session
tmux swap-pane -s %hidden_pane -t %visible_pane
```

### 4. Startup Flow

v2.0 startup differs from v1.0:

```
v1.0: HUD is standalone process, detects external sessions
v2.0: HUD creates/joins tmux session, manages panes directly

Startup sequence:
1. Check if already in tmux (TMUX env var)
2. If not: create new tmux session, exec HUD inside it
3. If yes: split current window for HUD strip
4. Run HUD Ink app in top pane (2 lines)
5. Bottom pane ready for Claude sessions
6. Detect any pre-existing Claude sessions (external or prior HUD-managed)
```

### 5. External Session Detection

v2.0 still needs to detect externally-created tmux sessions (not spawned by HUD):
- Existing `getTmuxPanes()` continues working unchanged
- Integrate external sessions into tab bar alongside HUD-managed sessions
- Mark with indicator to distinguish from HUD-spawned sessions

## Version Verification

| Package | Current | Required | Notes |
|---------|---------|----------|-------|
| ink | 6.6.0 | 6.6.0 | No change - supports height prop on Box |
| react | 19.2.3 | >=19.0.0 | No change - already upgraded in v1.0 |
| zustand | 5.0.10 | 5.x | No change - state management |
| tmux | (system) | 3.0+ | Required on host; split-window -l % requires 2.9+ |

**Note:** The v1.0 STACK.md mentioned React 18.x requirement, but the actual package.json shows React 19.2.3. Ink 6.6.0 peer dependencies show `"react": ">=19.0.0"` - the React 19 compatibility issue appears to have been resolved.

## Installation

**No new npm packages.** Ensure tmux is available:

```bash
# Verify tmux version (need 3.0+ for all features)
tmux -V

# Debian/Ubuntu
apt install tmux

# macOS
brew install tmux

# Already satisfied in existing dev environment
```

## Sources

### Primary (HIGH confidence)
- [tmux man page](https://man7.org/linux/man-pages/man1/tmux.1.html) - Official command reference
- [Super Guide to split-window](https://gist.github.com/sdondley/b01cc5bb1169c8c83401e438a652b84e) - Comprehensive split-window patterns
- [tmux Advanced Use Wiki](https://github.com/tmux/tmux/wiki/Advanced-Use) - Scripting patterns, pane targeting with IDs
- [Tao of Tmux - Scripting](https://tao-of-tmux.readthedocs.io/en/latest/manuscript/10-scripting.html) - Shell scripting patterns
- [Tao of Tmux - Panes](https://tao-of-tmux.readthedocs.io/en/latest/manuscript/07-pane.html) - Pane targeting tokens

### Secondary (MEDIUM confidence)
- [node-tmux GitHub](https://github.com/StarlaneStudios/node-tmux) - Evaluated and rejected (8 stars, missing pane operations)
- [stmux GitHub](https://github.com/rse/stmux) - Evaluated and rejected (replaces tmux)
- [Ink GitHub](https://github.com/vadimdemedes/ink) - Box height prop confirmation

---

*v2.0 Stack research: 2026-01-25*
*Valid until: 2026-03-25 (60 days - stable domain)*
