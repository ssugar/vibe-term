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
