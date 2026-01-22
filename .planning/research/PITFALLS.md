# Pitfalls Research

**Domain:** TUI HUD for monitoring Claude Code instances
**Researched:** 2026-01-22
**Confidence:** MEDIUM-HIGH (Multiple sources, verified patterns)

## Ink-Specific Pitfalls

### Critical: Performance Degradation with High-Frequency Re-renders

**What goes wrong:** Applications that update state frequently (like process monitors with polling) can cause significant performance issues. Gatsby's team noticed their build process slowed down when using Ink for status displays.

**Why it happens:** Each state update triggers a full re-render cycle. With polling intervals and multiple data sources updating simultaneously, renders can queue up.

**Consequences:**
- UI becomes sluggish or unresponsive
- High CPU usage from constant rendering
- Terminal flickering

**Warning signs:**
- CPU usage spikes when HUD is running
- UI lags behind actual process state
- Visual artifacts or flickering

**Prevention:**
- Use Ink's `<Static>` component for content that doesn't need updates (completed items, logs)
- Batch state updates rather than updating on every poll
- Use appropriate polling intervals (500ms-2000ms, not 100ms)
- Leverage Ink 3's improved rendering (2x performance improvement over Ink 2)

**Phase to address:** Phase 1 (Core Architecture) - establish update patterns early

**Sources:**
- [Ink 3 Release Notes](https://vadimdemedes.com/posts/ink-3)
- [Building Terminal Interfaces with Node.js](https://blog.openreplay.com/building-terminal-interfaces-nodejs/)

---

### Critical: Memory Leaks from Uncleared Timers and Subscriptions

**What goes wrong:** Polling intervals, process watchers, and tmux subscriptions continue running after component unmount, consuming memory and causing stale state updates.

**Why it happens:** React cleanup patterns from web development don't always translate directly. Developers forget to clear `setInterval` in `useEffect` cleanup, or don't properly unsubscribe from event emitters.

**Consequences:**
- Memory usage grows over time
- "Can't perform state update on unmounted component" warnings
- Eventual application crash
- Stale data from dead subscriptions

**Warning signs:**
- Memory usage increases over time without new sessions
- Console warnings about state updates after unmount
- Multiple identical poll requests in logs

**Prevention:**
```typescript
useEffect(() => {
  const interval = setInterval(pollProcesses, 1000);
  const unsubscribe = processWatcher.subscribe(handler);

  return () => {
    clearInterval(interval);
    unsubscribe();
  };
}, []);
```

**Phase to address:** Phase 1 (Core Architecture) - establish cleanup patterns in initial hooks

**Sources:**
- [Handling Memory Leaks in React](https://www.lucentinnovation.com/resources/technology-posts/handling-memory-leaks-in-react-for-optimal-performance)
- [How to Fix Memory Leaks in React Applications](https://www.freecodecamp.org/news/fix-memory-leaks-in-react-apps/)

---

### Moderate: IME (Input Method Editor) Performance Issues

**What goes wrong:** Ink's TextInput component has known issues with IME input causing significant performance degradation and duplicate conversion candidates.

**Why it happens:** React Ink's TextInput component makes incorrect assumptions about IME usage in terminal environments.

**Consequences:**
- Slow/laggy text input for users with IME
- Duplicate characters appearing
- Poor experience for non-ASCII input

**Warning signs:**
- Users report sluggish keyboard response
- Character duplication when typing

**Prevention:**
- For this HUD, minimize text input requirements (use keyboard shortcuts instead)
- If text input needed, compose in external editor and paste
- This is a known upstream issue with no direct fix available

**Phase to address:** Phase 2 (UI Components) - design around keyboard shortcuts, not text input

**Sources:**
- [GitHub Issue: IME Issues in Claude Code](https://github.com/anthropics/claude-code/issues/3045)

---

### Moderate: Focus Management Complexity

**What goes wrong:** Multiple interactive components compete for input focus, causing unpredictable behavior when users navigate.

**Why it happens:** Ink's `useInput` hook captures all keyboard input. Multiple components with `useInput` can handle the same input multiple times.

**Consequences:**
- Keyboard shortcuts trigger wrong actions
- Focus jumps unexpectedly
- Navigation becomes confusing

**Warning signs:**
- Users report keyboard shortcuts not working consistently
- Multiple components respond to same keypress

**Prevention:**
- Use `useFocus` and `useFocusManager` hooks explicitly
- Set `isActive: false` option on `useInput` for unfocused components
- Design clear focus hierarchy upfront
- Implement focus indicators so users know what's selected

**Phase to address:** Phase 2 (UI Components) - design focus model with keyboard navigation

**Sources:**
- [Ink v3 Advanced UI Components Reference](https://developerlife.com/2021/11/25/ink-v3-advanced-ui-components/)
- [Ink 3 Release Notes](https://vadimdemedes.com/posts/ink-3)

---

### Minor: Console.log Interference

**What goes wrong:** `console.log` calls corrupt the Ink UI display, causing visual glitches.

**Why it happens:** Ink intercepts console methods to render logs above the UI, but direct console output can still interfere with rendering.

**Consequences:**
- Debug output breaks UI layout
- Logs appear in wrong locations
- Visual corruption

**Prevention:**
- Use Ink's logging patterns (`useStderr`, write to files)
- Remove or gate debug console.log calls
- Use Ink 3's built-in console interception (logs display above UI)

**Phase to address:** Phase 1 - establish logging conventions early

---

### Minor: Flexbox Layout Limitations

**What goes wrong:** Percentage-based `minWidth`/`minHeight` don't work; developers expect full CSS flexbox compatibility.

**Why it happens:** Ink uses Yoga for flexbox layout, which has some limitations compared to browser CSS.

**Consequences:**
- Layouts break at certain terminal sizes
- Elements don't resize as expected

**Warning signs:**
- UI looks wrong at small terminal sizes
- Components overlap or truncate unexpectedly

**Prevention:**
- Test at various terminal sizes (80x24, 120x40, 200x60)
- Use fixed minimum values instead of percentages
- Wrap `<Text>` correctly (all text must be in `<Text>` components)
- Don't use `<Transform>` in ways that change dimensions

**Phase to address:** Phase 2 (UI Components) - test layouts at multiple sizes

**Sources:**
- [Yoga Flexbox Issue #872](https://github.com/facebook/yoga/issues/872)
- [Ink GitHub Repository](https://github.com/vadimdemedes/ink)

---

## Cross-Platform Pitfalls

### Critical: child_process.spawn Behavior Differences

**What goes wrong:** Code that works on Linux/macOS fails on Windows with ENOENT errors, or vice versa.

**Why it happens:**
- Windows requires `shell: true` to run scripts
- `path.resolve()` returns backslashes on Windows, but spawn needs forward slashes
- `.bat`/`.cmd` files can't run with `execFile()` on Windows
- PATHEXT is ignored by spawn on Windows

**Consequences:**
- "spawn npm ENOENT" errors on Windows
- Scripts work locally but fail in CI
- WSL2 users hit different bugs than native Linux

**Warning signs:**
- Works on developer machine, fails on user machine
- ENOENT errors with correct file paths
- "command not found" for commands that exist

**Prevention:**
```typescript
import { platform } from 'os';

// Platform-aware spawn
const isWindows = platform() === 'win32';

spawn(command, args, {
  shell: isWindows, // Required for Windows scripts
  // Or use cross-spawn package
});

// Or better: use cross-spawn
import spawn from 'cross-spawn';
```

**Phase to address:** Phase 1 (Core Architecture) - use cross-spawn or platform abstractions from start

**Sources:**
- [Node.js child_process.spawn Issues](https://github.com/nodejs/node/issues/3675)
- [Cross-platform child process](https://www.brainbell.com/javascript/child-process.html)
- [Resolving Compatibility Issues](https://medium.com/@python-javascript-php-html-css/resolving-compatibility-issues-with-node-js-child-process-spawn-and-grep-across-platforms-b33be96f9438)

---

### Critical: WSL2-Specific Issues

**What goes wrong:** WSL2 has unique characteristics that can break cross-platform assumptions.

**Why it happens:** WSL2 is neither native Windows nor native Linux. PATH conflicts, filesystem performance, and process visibility behave differently.

**Consequences:**
- Node.js runs from Windows PATH instead of WSL
- Performance 3x slower than expected in some scenarios
- Localhost networking intermittently fails
- Cannot access Windows processes from WSL or vice versa

**Warning signs:**
- Different behavior on WSL2 vs native Linux
- `which node` returns Windows path
- Connections to localhost fail intermittently

**Prevention:**
```bash
# /etc/wsl.conf
[interop]
appendWindowsPath=false  # Prevent Windows PATH pollution
```

```typescript
// Detect WSL2
const isWSL = process.platform === 'linux' &&
  (fs.existsSync('/proc/version') &&
   fs.readFileSync('/proc/version', 'utf8').includes('microsoft'));

// Handle accordingly
if (isWSL) {
  // WSL-specific process detection path
}
```

**Phase to address:** Phase 3 (Process Detection) - implement WSL2-specific detection logic

**Sources:**
- [Microsoft WSL Documentation](https://learn.microsoft.com/en-us/windows/wsl/troubleshooting)
- [WSL GitHub Issues](https://github.com/microsoft/WSL/issues/6851)
- [Working with Node.js on WSL2](https://blog.logrocket.com/working-with-node-js-on-hyper-v-and-wsl2/)

---

### Moderate: Terminal Color Support Detection

**What goes wrong:** Colors display incorrectly, not at all, or corrupt the display in certain terminals.

**Why it happens:** Not all terminals support ANSI colors, and support levels vary (16 colors, 256 colors, truecolor). SSH sessions and minimal terminals often have limited support.

**Consequences:**
- Ugly/unreadable UI in unsupported terminals
- ANSI escape codes displayed as literal text
- Colors that work locally break in CI or SSH

**Warning signs:**
- Users report "garbage characters" in output
- Colors look wrong in screenshots

**Prevention:**
```typescript
import { supportsColor } from 'chalk';

// Check before assuming color support
if (process.stdout.isTTY && supportsColor) {
  // Use colors
} else {
  // Graceful fallback
}

// Or use environment variables
// FORCE_COLOR=0 disables, FORCE_COLOR=1/2/3 enables
```

**Phase to address:** Phase 2 (UI Components) - test in multiple terminal types

**Sources:**
- [Using Console Colors with Node.js](https://blog.logrocket.com/using-console-colors-node-js/)
- [ansi-colors npm](https://www.npmjs.com/package/ansi-colors)

---

### Minor: Terminal Resize Handling

**What goes wrong:** UI doesn't update when terminal is resized, or crashes on resize.

**Why it happens:** Node.js has a bug where TTY 'resize' event doesn't fire unless SIGWINCH is also listened on process.

**Consequences:**
- Layout breaks after resize
- Content gets cut off
- Must restart app after resize

**Prevention:**
```typescript
// Listen to both
process.stdout.on('resize', handleResize);
process.on('SIGWINCH', handleResize); // Required for resize to fire

function handleResize() {
  const { columns, rows } = process.stdout;
  // Update layout
}
```

**Phase to address:** Phase 2 (UI Components) - Ink may handle this, but verify

**Sources:**
- [Node.js TTY Resize Issue](https://github.com/nodejs/node/issues/19609)
- [window-size npm](https://www.npmjs.com/package/window-size)

---

## Process Detection Pitfalls

### Critical: Process Detection Method Varies by Platform

**What goes wrong:** Code assumes a single method works everywhere. Linux uses `/proc`, macOS uses `ps`, Windows uses `wmic`.

**Why it happens:** Each OS exposes process information differently. Libraries like `pidusage` and `ps-list` abstract this, but with subtle differences.

**Consequences:**
- Missing processes on some platforms
- Different data available per platform
- Performance varies dramatically

**Warning signs:**
- Same code returns different results per OS
- Processes visible in terminal not detected by app

**Prevention:**
- Use established libraries: `ps-list`, `pidusage`, or `find-process`
- Test on all target platforms (not just development machine)
- Document what data is available per platform
- Have fallback detection methods

```typescript
import psList from 'ps-list';

// Works cross-platform but returns different fields
const processes = await psList();
// Check actual fields available before using
```

**Phase to address:** Phase 3 (Process Detection) - build abstraction layer with platform fallbacks

**Sources:**
- [pidusage GitHub](https://github.com/soyuka/pidusage)
- [ps-list vs pidusage comparison](https://npm-compare.com/pidusage,ps-list,ps-node)

---

### Critical: Detecting Claude Code Instances

**What goes wrong:** Claude Code detection may break with updates, use inconsistent process names, or have multiple processes per instance.

**Why it happens:** Claude Code's implementation details aren't guaranteed stable. Process names may vary by installation method or version.

**Consequences:**
- HUD shows no instances when Claude Code is running
- Multiple entries for single instance
- Incorrect status for detected instances

**Warning signs:**
- Process list shows Claude but HUD doesn't
- Instance count doesn't match reality

**Prevention:**
- Parse Claude Code's JSONL logs as primary source: `~/.claude/projects/<project>/<session-id>.jsonl`
- Use process detection as secondary/fallback
- Match on multiple criteria (process name, command line, working directory)
- Handle gracefully when detection fails
- Log detection attempts for debugging

**Phase to address:** Phase 3 (Process Detection) - implement multi-method detection

**Sources:**
- [Claude Code Log Location](https://simonwillison.net/2025/Oct/22/claude-code-logs/)
- [Claude Code JSONL Parser](https://github.com/amac0/ClaudeCodeJSONLParser)

---

### Moderate: Polling Interval Performance Impact

**What goes wrong:** Polling too frequently causes high CPU usage; too infrequently causes stale data.

**Why it happens:** Process detection involves OS calls that aren't free. Combining with UI re-renders multiplies impact.

**Consequences:**
- HUD itself becomes resource hog
- Stale status display
- Battery drain on laptops

**Warning signs:**
- HUD process shows high CPU in activity monitor
- Status updates feel sluggish or delayed

**Prevention:**
```typescript
// Use appropriate intervals
const POLL_INTERVAL = 2000; // 2 seconds is reasonable for status

// Use integer intervals (float causes bugs)
setInterval(poll, 2000); // Good
setInterval(poll, 2000.5); // Bad - causes CPU spike

// Consider adaptive polling
const interval = hasActiveProcesses ? 1000 : 5000;
```

**Phase to address:** Phase 3 (Process Detection) - tune and make configurable

**Sources:**
- [setInterval Float Bug](https://github.com/nodejs/node-v0.x-archive/issues/7391)
- [Node.js Event Loop](https://blog.platformatic.dev/the-nodejs-event-loop)

---

### Moderate: Active Window Detection Limitations

**What goes wrong:** Can't reliably detect which terminal window is active, or which tmux pane has focus.

**Why it happens:**
- Wayland doesn't expose active window for security reasons
- macOS Terminal.app returns same PID for all windows
- X11 libraries require native bindings

**Consequences:**
- Can't implement "jump to active" feature on all platforms
- Features work inconsistently across platforms

**Warning signs:**
- Feature works on dev machine but not user's
- Wayland users report "not supported" errors

**Prevention:**
- Make active window detection optional/graceful fallback
- Use `active-win` package but handle `undefined` result
- Don't design features that critically depend on this
- Consider alternative: focus by session ID rather than "current window"

**Phase to address:** Phase 4 (Terminal Integration) - design around limitations

**Sources:**
- [active-win npm](https://www.npmjs.com/package/active-win)
- [node-window-manager GitHub](https://github.com/sentialx/node-window-manager)

---

## Terminal Integration Pitfalls

### Critical: tmux State Synchronization

**What goes wrong:** HUD state and actual tmux sessions get out of sync. Sessions show as running when killed, or vice versa.

**Why it happens:** Manual session termination, tmux crashes, or network disconnects don't notify the HUD.

**Consequences:**
- Zombie entries in HUD
- Missing active sessions
- User can't trust HUD display

**Warning signs:**
- Session counts don't match `tmux list-sessions`
- "Jump to session" fails with error

**Prevention:**
- Re-query tmux state on every display refresh
- Don't cache tmux state for long
- Handle "session not found" errors gracefully
- Provide manual refresh option
- Consider tmux control mode for real-time notifications

```typescript
// Always verify session exists before operations
const sessions = await getTmuxSessions();
if (!sessions.includes(targetSession)) {
  // Handle missing session
}
```

**Phase to address:** Phase 4 (Terminal Integration) - design for eventual consistency

**Sources:**
- [tmux Session Disappearing Issues](https://github.com/tmux/tmux/issues/1776)
- [tmux-claude-mcp-server Common Issues](https://deepwiki.com/michael-abdo/tmux-claude-mcp-server/11.1-common-issues)

---

### Critical: tmux Output Parsing Fragility

**What goes wrong:** Parsing tmux command output breaks with different tmux versions, locales, or unexpected content.

**Why it happens:** Relying on string parsing of human-readable output rather than machine-readable formats.

**Consequences:**
- HUD breaks after tmux update
- Non-English locales cause parse failures
- Special characters in session names cause errors

**Warning signs:**
- Works locally, fails on CI or other machines
- Errors when session names contain spaces or special chars

**Prevention:**
```bash
# Use format strings for machine-readable output
tmux list-sessions -F "#{session_id}:#{session_name}:#{session_attached}"

# Use capture-pane with -p for stdout
tmux capture-pane -t "$session:$window.$pane" -p

# Consider tmux control mode for structured output
tmux -C new-session  # Returns structured notifications
```

**Phase to address:** Phase 4 (Terminal Integration) - use format strings from start

**Sources:**
- [tmux Output Formatting](https://qmacro.org/blog/posts/2021/08/06/tmux-output-formatting/)
- [tmux Control Mode Wiki](https://github.com/tmux/tmux/wiki/Control-Mode)

---

### Moderate: Non-tmux Session Detection

**What goes wrong:** Can only detect Claude instances in tmux, missing standalone terminal windows.

**Why it happens:** Terminal emulators don't provide standardized APIs. Each one (iTerm2, GNOME Terminal, Konsole) has different (or no) programmatic access.

**Consequences:**
- Users not using tmux see incomplete status
- Feature asymmetry confuses users

**Warning signs:**
- Users report "HUD doesn't see my sessions"
- Works in tmux, not in regular terminals

**Prevention:**
- Use process detection as primary method (process name, command line)
- tmux integration as secondary enhancement
- Parse Claude Code's log files (`~/.claude/projects/`) as source of truth
- Document what's detected and what isn't

**Phase to address:** Phase 3 (Process Detection) - process-based detection covers this

**Sources:**
- [Claude Code JSONL Browser](https://github.com/withLinda/claude-JSONL-browser)

---

### Moderate: Graceful Shutdown and Cleanup

**What goes wrong:** HUD exit leaves terminal in bad state, cursor hidden, raw mode stuck.

**Why it happens:** Ctrl+C handling doesn't properly clean up Ink state and restore terminal settings.

**Consequences:**
- Terminal unusable after HUD crash
- Need to run `reset` command
- Lost cursor or weird input behavior

**Warning signs:**
- Users report terminal "broken" after HUD use
- Must close and reopen terminal

**Prevention:**
```typescript
import { useApp } from 'ink';

// Handle exit properly
const { exit } = useApp();

useInput((input, key) => {
  if (input === 'q' || key.ctrl && input === 'c') {
    exit();
  }
});

// Also handle process signals
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});
```

**Phase to address:** Phase 1 (Core Architecture) - implement from the start

**Sources:**
- [Ink useApp Hook](https://github.com/vadimdemedes/ink)
- [Node.js Graceful Shutdown](https://dev.to/yusadolat/nodejs-graceful-shutdown-a-beginners-guide-40b6)

---

### Minor: Security - Command Injection via User Input

**What goes wrong:** If session names or paths come from user input and are passed to shell commands, attackers can inject malicious commands.

**Why it happens:** Using `exec()` with string concatenation instead of `spawn()` with argument arrays.

**Consequences:**
- Arbitrary command execution
- Data exfiltration
- System compromise

**Warning signs:**
- Using `exec()` anywhere in codebase
- String concatenation for shell commands

**Prevention:**
```typescript
// NEVER do this
exec(`tmux send-keys -t ${sessionName} "ls"`);

// DO this instead
spawn('tmux', ['send-keys', '-t', sessionName, 'ls']);

// Even better: use execFile for external commands
execFile('tmux', ['list-sessions', '-F', '#{session_name}']);
```

**Phase to address:** Phase 4 (Terminal Integration) - code review for all shell calls

**Sources:**
- [Preventing Command Injection in Node.js](https://auth0.com/blog/preventing-command-injection-attacks-in-node-js-apps/)
- [Node.js Command Injection](https://www.stackhawk.com/blog/nodejs-command-injection-examples-and-prevention/)

---

## Prevention Strategies Summary

### Phase 1 (Core Architecture)
| Pitfall | Prevention Strategy |
|---------|---------------------|
| Memory leaks | Establish useEffect cleanup patterns in all hooks |
| Console interference | Set up dedicated logging (file or stderr) |
| Graceful shutdown | Implement signal handlers from start |
| Cross-platform spawn | Use `cross-spawn` package throughout |

### Phase 2 (UI Components)
| Pitfall | Prevention Strategy |
|---------|---------------------|
| Performance degradation | Use `<Static>` for logs, batch updates, reasonable intervals |
| Focus complexity | Design clear focus model with `useFocus`/`useFocusManager` |
| IME issues | Use keyboard shortcuts instead of text input |
| Layout issues | Test at multiple terminal sizes |
| Color support | Use chalk with automatic detection |
| Resize handling | Listen to both 'resize' and SIGWINCH |

### Phase 3 (Process Detection)
| Pitfall | Prevention Strategy |
|---------|---------------------|
| Platform differences | Use ps-list/pidusage with fallbacks |
| Claude detection | Use JSONL logs as primary source, process detection as backup |
| Polling performance | Use 2s intervals, integer values, adaptive polling |
| WSL2 issues | Detect WSL2 and use platform-specific paths |
| Active window limits | Make feature optional, handle gracefully |

### Phase 4 (Terminal Integration)
| Pitfall | Prevention Strategy |
|---------|---------------------|
| tmux sync | Re-query on refresh, handle missing sessions |
| Output parsing | Use `-F` format strings, not human-readable output |
| Non-tmux detection | Rely on process detection, not terminal APIs |
| Command injection | Use spawn/execFile with argument arrays, never exec |

---

## Quality Checklist

Before each phase completion, verify:

- [ ] All timers/intervals have cleanup in useEffect return
- [ ] Signal handlers restore terminal state
- [ ] Shell commands use spawn/execFile, not exec
- [ ] Cross-platform tested (Linux, macOS, WSL2 if possible)
- [ ] Color support detection in place
- [ ] Error states handled gracefully (no crashes)
- [ ] Focus behavior tested with multiple components
- [ ] Layout tested at 80x24 and 200x60 terminal sizes
