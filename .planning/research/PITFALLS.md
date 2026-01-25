# Pitfalls Research: v2.0 tmux Integration

**Domain:** tmux-integrated terminal application (Ink HUD + managed session panes)
**Researched:** 2026-01-25
**Confidence:** HIGH (verified with official sources, GitHub issues, and codebase analysis)

## Critical Pitfalls

### Pitfall 1: HUD Pane Resizing Breaks Layout

**Symptom:** After terminal window resize, the HUD strip (top pane) becomes too large or too small, or pane ratio resets to 50%.

**Cause:** When using `split-window -p <percentage>`, tmux may reset pane ratios to 50% after window resize operations. The percentage is calculated at split time, not maintained dynamically.

**Warning Signs:**
- HUD strip grows to consume half the screen after resize
- User resizes their terminal and HUD becomes unusable
- Layout looks correct initially but breaks when terminal dimensions change

**Prevention:**
- Use fixed line count (`split-window -l 2`) instead of percentage for HUD strip
- Listen for terminal resize (SIGWINCH) and re-adjust pane size with `resize-pane -y 2`
- Save and restore HUD height after resize operations
- Test with aggressive terminal resizing during development

**Phase:** Phase 06-02 (tmux pane architecture) - establish resize-resilient layout from start

**Sources:**
- [tmux split pane ratio reset issue](https://github.com/tmux/tmux/issues/2094)
- [tmux resize-pane percentage feature request](https://github.com/tmux/tmux/issues/383)

---

### Pitfall 2: Input Goes to Wrong Pane After Focus Switch

**Symptom:** User types in HUD pane but input appears in session pane, or vice versa.

**Cause:** Known tmux bug where `pane-focus-in` event triggers in the wrong (former) pane. Also, `select-pane` doesn't always synchronize with actual input routing immediately.

**Warning Signs:**
- User selects HUD pane but keystrokes affect Claude session
- Focus indicator shows one pane but input goes elsewhere
- Problem intermittent and hard to reproduce

**Prevention:**
- Add small delay (50-100ms) after `select-pane` before accepting input
- Use `tmux display-message -p '#{pane_id}'` to verify focus after switch
- Implement explicit focus verification before routing keystrokes
- Avoid mouse-based pane selection when possible (more prone to issues)
- Test focus switching rapidly in development

**Phase:** Phase 06-03 (input handling) - verify focus before processing input

**Sources:**
- [pane-focus-in wrong pane issue](https://github.com/tmux/tmux/issues/3506)
- [Wrong pane focus with mouse click](https://github.com/tmux/tmux/issues/619)

---

### Pitfall 3: Nested tmux Detection and Session Creation

**Symptom:** Error "sessions should be nested with care, unset $TMUX to force" when spawning sessions, or HUD creates duplicate nested sessions.

**Cause:** HUD running inside tmux sets `$TMUX` environment variable, which prevents creating new tmux sessions or attaching from child processes.

**Warning Signs:**
- `tmux new-session` commands fail with nested session warning
- User runs HUD from within existing tmux and spawning breaks
- HUD works standalone but fails inside tmux

**Prevention:**
```typescript
// Check if already in tmux before operations
const isInTmux = !!process.env.TMUX;

if (isInTmux) {
  // Use switch-client or select-window, not attach or new-session
  await execAsync(`tmux switch-client -t "${sessionName}"`);
} else {
  // Can use new-session or attach
  await execAsync(`tmux new-session -d -s "${sessionName}"`);
}
```
- Always detect tmux context before session operations
- Use `switch-client` for within-tmux navigation
- Provide clear error message if nested context prevents operation

**Phase:** Phase 06-02 (session management) - detect context before every session operation

**Sources:**
- [Nested tmux sessions guidance](https://koenwoortman.com/tmux-sessions-should-be-nested-with-care-unset-tmux-to-force/)
- [tmux nested session best practices](https://www.freecodecamp.org/news/tmux-in-practice-local-and-nested-remote-tmux-sessions-4f7ba5db8795/)

---

### Pitfall 4: send-keys Race Conditions

**Symptom:** Commands sent via `tmux send-keys` execute out of order, partially, or not at all.

**Cause:** `send-keys` operations are asynchronous and can race with each other or with shell state changes. Sending signals like Ctrl-Z creates race conditions with shell job control.

**Warning Signs:**
- Commands appear truncated in session pane
- Multi-key sequences don't complete (e.g., vim mode switching)
- Spawned process doesn't receive intended input

**Prevention:**
```typescript
// Bad: multiple send-keys in sequence
await execAsync(`tmux send-keys -t "${pane}" "cd /path" C-m`);
await execAsync(`tmux send-keys -t "${pane}" "claude" C-m`);

// Better: combine into single shell command
await execAsync(`tmux send-keys -t "${pane}" "cd /path && claude" C-m`);

// Or: add explicit sync
await execAsync(`tmux send-keys -t "${pane}" "cd /path" C-m`);
await new Promise(resolve => setTimeout(resolve, 100)); // Wait for shell
await execAsync(`tmux send-keys -t "${pane}" "claude" C-m`);
```
- Combine commands when possible
- Add delays between dependent send-keys operations
- Avoid Ctrl-Z or other signal keys through send-keys
- Test with slow shells/machines

**Phase:** Phase 06-03 (session spawning) - use combined commands or explicit synchronization

**Sources:**
- [send-keys async execution issue](https://github.com/tmux/tmux/issues/1517)
- [send-keys Ctrl-Z race condition](https://github.com/tmux/tmux/issues/3360)

---

### Pitfall 5: TERM Environment Breaks Ink Rendering

**Symptom:** Ink app renders incorrectly inside tmux pane - colors wrong, characters garbled, or layout broken.

**Cause:** tmux sets `TERM=screen` or `TERM=tmux-256color` which may not match what Ink expects. The terminal capabilities described by TERM affect how Ink renders.

**Warning Signs:**
- Colors look wrong (16 colors instead of 256)
- Box-drawing characters display as `q`, `x`, etc.
- Cursor invisible or in wrong position
- Works outside tmux but breaks inside

**Prevention:**
```bash
# In tmux.conf
set-option -g default-terminal "tmux-256color"
set-option -ga terminal-overrides ",xterm-256color:Tc"
```

```typescript
// In HUD startup, verify TERM compatibility
const term = process.env.TERM;
if (term && !term.includes('256color') && !term.includes('truecolor')) {
  console.warn('Limited color support detected. Set TERM=xterm-256color for best results.');
}
```
- Document required tmux configuration
- Detect and warn about incompatible TERM settings
- Test HUD in fresh tmux with default config
- Never manually set TERM in application code (let tmux handle it)

**Phase:** Phase 06-01 (HUD pane setup) - verify TERM on startup

**Sources:**
- [tmux FAQ on TERM settings](https://github.com/tmux/tmux/wiki/FAQ)
- [tmux TERM environment issues](https://github.com/tmux/tmux/issues/1790)

---

## Moderate Pitfalls

### Pitfall 6: Working Directory Confusion When Spawning

**Symptom:** New Claude sessions spawn in wrong directory, or `#{pane_current_path}` returns unexpected value.

**Cause:** By default, tmux opens new panes in the directory where tmux server started, not the current pane's directory. Different shells (bash, zsh, fish) also handle PWD differently.

**Warning Signs:**
- User expects session in project dir but it opens in ~
- `split-window` ignores apparent current directory
- Works with bash, breaks with fish shell

**Prevention:**
```typescript
// Always specify working directory explicitly
await execAsync(
  `tmux split-window -v -c "${projectPath}" "claude"`,
  { cwd: projectPath }
);

// Or use pane_current_path format
await execAsync(
  `tmux split-window -v -c '#{pane_current_path}' "claude"`
);
```
- Never rely on default working directory
- Always pass `-c` option with explicit path
- Verify directory exists before spawning
- Handle paths with spaces (quote properly)

**Phase:** Phase 06-03 (session spawning) - always specify -c directory

**Sources:**
- [tmux working directories explained](https://tmuxai.dev/tmux-working-directories/)
- [New panes in same directory](https://qmacro.org/blog/posts/2021/04/01/new-tmux-panes-and-windows-in-the-right-directory/)

---

### Pitfall 7: Pane Process Exit Leaves Dead Panes

**Symptom:** Claude session exits but pane remains visible as empty/dead, cluttering the window.

**Cause:** By default, tmux destroys panes when their process exits. But if `remain-on-exit` is set (globally or on pane), dead panes persist.

**Warning Signs:**
- User closes Claude but blank pane remains
- Pane shows "[exited]" but doesn't close
- Layout has empty slots where sessions were

**Prevention:**
```typescript
// Detect dead panes during refresh
const paneStatus = await execAsync(
  `tmux list-panes -t "${target}" -F '#{pane_id}:#{?pane_dead,dead,alive}'`
);

// Clean up dead panes
if (paneStatus.includes('dead')) {
  await execAsync(`tmux kill-pane -t "${paneId}"`);
}
```
- Don't set global `remain-on-exit` option
- Check for dead panes during session refresh cycle
- Provide manual cleanup option (kill dead panes)
- Consider auto-cleanup with configurable delay

**Phase:** Phase 06-04 (session lifecycle) - detect and clean dead panes

**Sources:**
- [tmux respawn pane management](https://tmuxai.dev/tmux-respawn-pane/)
- [Baeldung tmux kill/respawn](https://www.baeldung.com/linux/tmux-kill-respawn-pane)

---

### Pitfall 8: Window/Pane ID Instability

**Symptom:** Cached pane IDs become invalid, causing operations to fail with "no such pane" errors.

**Cause:** tmux pane IDs change when windows are rearranged, panes are killed, or session is re-created. IDs are not persistent across tmux server restarts.

**Warning Signs:**
- "can't find pane" errors after some time
- Operations work initially then fail
- Works until user manually manipulates tmux layout

**Prevention:**
```typescript
// Don't cache pane IDs long-term
// Re-resolve target before each operation
async function getValidTarget(sessionName: string): Promise<string | null> {
  const result = await execAsync(
    `tmux list-panes -t "${sessionName}" -F '#{pane_id}' 2>/dev/null`
  );
  return result.stdout.trim() || null;
}

// Always handle "not found" gracefully
try {
  await execAsync(`tmux select-pane -t "${target}"`);
} catch (e) {
  if (e.message.includes("can't find")) {
    // Pane no longer exists, refresh state
    await refreshSessions();
  }
}
```
- Never cache pane/window IDs for more than one operation
- Re-query tmux state before operations
- Handle "not found" errors as normal state, not exceptions
- Use session names (stable) rather than IDs when possible

**Phase:** Phase 06-02 (session detection) - always re-resolve before operations

**Sources:**
- [tmux session disappearing issues](https://github.com/tmux/tmux/issues/1776)

---

### Pitfall 9: Terminal Size Not Propagated to Pane

**Symptom:** Ink app doesn't detect resize, displays at wrong dimensions, or content gets clipped.

**Cause:** Resizing tmux panes doesn't always trigger SIGWINCH in running processes. Also, `tput` may report stale dimensions after resize.

**Warning Signs:**
- HUD content doesn't reflow after pane resize
- Layout looks correct initially but breaks after resize
- `process.stdout.columns` returns old value

**Prevention:**
```typescript
// Force SIGWINCH propagation
process.on('SIGWINCH', () => {
  // Re-read dimensions
  const { columns, rows } = process.stdout;
  // Trigger Ink re-render
  forceRerender();
});

// Also listen to stdout resize event
process.stdout.on('resize', handleResize);
```

From tmux side:
```bash
# Send SIGWINCH to pane process
kill -WINCH $(tmux display-message -p '#{pane_pid}')
```
- Listen to both SIGWINCH and stdout resize
- Don't trust cached terminal dimensions
- Re-query dimensions before each render cycle
- Test with frequent resize during development

**Phase:** Phase 06-01 (HUD rendering) - handle resize signals properly

**Sources:**
- [tmux resize not updating terminfo](https://github.com/tmux/tmux/issues/2005)
- [Programs report incorrect size after resize](https://github.com/tmux/tmux/issues/1880)

---

### Pitfall 10: Keyboard Input Conflicts Between HUD and Sessions

**Symptom:** Keystrokes meant for HUD affect Claude session, or HUD captures keys that should go to session.

**Cause:** Both HUD pane and session pane are active in the same tmux window. Without careful input routing, keys can be misrouted based on which pane has tmux focus vs which pane the user thinks is active.

**Warning Signs:**
- User presses 'q' to quit HUD but Claude receives it
- HUD hotkey triggers while user is typing in Claude
- Input behavior unpredictable

**Prevention:**
- Design clear focus model: HUD pane ONLY receives input when tmux focus is on it
- Visual focus indicator (border color, title) showing which pane is active
- HUD should detect when it doesn't have tmux focus and ignore input
- Consider "pass-through mode" where HUD forwards keys to session pane
- Document expected focus switching behavior clearly

```typescript
// Detect if HUD pane currently has focus
async function hudHasFocus(): Promise<boolean> {
  const result = await execAsync(
    `tmux display-message -p '#{pane_active}'`
  );
  return result.stdout.trim() === '1';
}

// In input handler
useInput((input, key) => {
  // Only handle input if we have focus
  if (!hudHasFocus()) return;
  // ... handle input
});
```

**Phase:** Phase 06-03 (input handling) - implement focus-aware input routing

**Sources:**
- [tmux pane focus events](https://github.com/tmux/tmux/issues/2808)

---

## Minor Pitfalls

### Pitfall 11: Child Process Cleanup on SIGKILL

**Symptom:** If HUD is killed (SIGKILL, not SIGTERM), child processes or tmux state may be left inconsistent.

**Cause:** SIGKILL cannot be caught, so cleanup handlers don't run. Any spawned processes or tmux manipulations cannot be undone.

**Warning Signs:**
- Zombie session panes after HUD crash
- tmux layout corrupted after force-kill
- Must manually clean up tmux state

**Prevention:**
- Use SIGTERM for normal shutdown (can be caught)
- Design for recovery: HUD should detect and clean up orphaned state on startup
- Don't spawn processes that would be problematic if abandoned
- Keep tmux state minimal (prefer detecting existing sessions over managing lifecycle)

**Phase:** Phase 06-04 (startup/shutdown) - implement orphan detection on startup

**Sources:**
- [Node.js child process SIGKILL issues](https://github.com/nodejs/node/issues/12101)

---

### Pitfall 12: tmux Version Incompatibility

**Symptom:** HUD commands fail on older tmux versions, or format strings don't work.

**Cause:** tmux features and format variables change between versions. Features like `display-popup` require tmux 3.2+, some format variables are newer.

**Warning Signs:**
- Works on dev machine, fails on user's older tmux
- "unknown command" or "bad format" errors
- Features present in docs but not in installed version

**Prevention:**
```typescript
// Check tmux version on startup
async function getTmuxVersion(): Promise<string> {
  const result = await execAsync('tmux -V');
  return result.stdout.trim(); // "tmux 3.3a"
}

// Document minimum version requirement
const MIN_TMUX_VERSION = '2.6'; // or whatever minimum we need
```
- Document minimum tmux version
- Test on oldest supported version in CI
- Avoid bleeding-edge features unless necessary
- Provide helpful error if version too old

**Phase:** Phase 06-01 (startup) - verify tmux version compatibility

**Sources:**
- [tmux changelog](https://raw.githubusercontent.com/tmux/tmux/master/CHANGES)

---

### Pitfall 13: Externally Created Sessions Not Detected

**Symptom:** User creates Claude session outside HUD (in a different tmux window/pane) and HUD doesn't see it.

**Cause:** HUD only monitors sessions it creates, or only monitors specific tmux session names. External sessions don't match expected patterns.

**Warning Signs:**
- User runs `claude` manually and HUD shows 0 sessions
- Sessions appear after HUD restart but not dynamically
- Detection works for spawned sessions but not pre-existing ones

**Prevention:**
- Use process detection (existing v1.0 approach) as primary method
- tmux integration is for management, not detection
- Scan all tmux panes for Claude processes, not just "known" sessions
- Regular polling of both process list and tmux pane list

**Phase:** Phase 06-02 (session detection) - existing useSessions hook already handles this

**Sources:**
- Existing codebase: `useSessions.ts` uses process detection independent of tmux state

---

## Integration Pitfalls (Ink + tmux)

### Pitfall 14: Ink stdout Conflicts with tmux Capture

**Symptom:** Using `tmux capture-pane` on HUD pane returns garbled output or interferes with Ink rendering.

**Cause:** Ink uses cursor movement, colors, and alternate screen buffer. Capturing pane content while Ink is rendering can get partial state.

**Warning Signs:**
- External tools trying to read HUD state get garbage
- Ink rendering corrupted after external pane capture
- Intermittent visual glitches

**Prevention:**
- Don't expose HUD pane for external capture
- If capture needed, pause Ink rendering first
- Use state store for programmatic access, not screen scraping
- Document that HUD pane shouldn't be captured

**Phase:** Phase 06-01 (HUD pane) - document limitation, don't support external capture

---

### Pitfall 15: Multiple HUD Instances Conflict

**Symptom:** User accidentally starts two HUD instances, causing tmux state confusion or duplicate session entries.

**Cause:** No singleton enforcement - user can start multiple `cc-hud` processes, each trying to manage the same tmux sessions.

**Warning Signs:**
- Duplicate entries in HUD after restart
- Operations fail with "already exists"
- Inconsistent state between two HUD windows

**Prevention:**
- Check for existing HUD process on startup (pid file or process detection)
- Lock file in temp directory
- Clear error message if HUD already running
- Offer to attach to existing HUD instead of starting new one

```typescript
// Check for existing instance
const lockFile = '/tmp/cc-hud.lock';
if (fs.existsSync(lockFile)) {
  const existingPid = fs.readFileSync(lockFile, 'utf8');
  if (processExists(existingPid)) {
    console.error(`HUD already running (pid ${existingPid}). Use existing instance.`);
    process.exit(1);
  }
}
// Create lock file
fs.writeFileSync(lockFile, process.pid.toString());
```

**Phase:** Phase 06-01 (startup) - implement instance locking

---

## Prevention Strategy Summary by Phase

### Phase 06-01: HUD Pane Foundation
| Pitfall | Prevention |
|---------|------------|
| TERM environment (#5) | Verify TERM on startup, document requirements |
| Terminal resize (#9) | Handle SIGWINCH + resize events |
| Multiple instances (#15) | Lock file or pid check |
| tmux version (#12) | Check version on startup |

### Phase 06-02: tmux Pane Architecture
| Pitfall | Prevention |
|---------|------------|
| Pane resizing (#1) | Use fixed `-l` lines, handle resize events |
| Nested tmux (#3) | Detect $TMUX, use appropriate commands |
| ID instability (#8) | Re-resolve before operations |
| External sessions (#13) | Use process detection, not just tmux tracking |

### Phase 06-03: Input Handling and Session Spawning
| Pitfall | Prevention |
|---------|------------|
| Input to wrong pane (#2) | Verify focus before handling input |
| send-keys races (#4) | Combine commands or add delays |
| Working directory (#6) | Always specify -c option |
| Keyboard conflicts (#10) | Focus-aware input routing |

### Phase 06-04: Session Lifecycle
| Pitfall | Prevention |
|---------|------------|
| Dead panes (#7) | Detect and clean during refresh |
| SIGKILL cleanup (#11) | Orphan detection on startup |

---

## Quality Checklist

Before completing tmux integration phases:

- [ ] HUD renders correctly inside tmux pane (colors, characters)
- [ ] Resize handling works (pane resize + terminal window resize)
- [ ] Session spawning works from within tmux (nested context)
- [ ] Input routing is predictable (HUD vs session pane)
- [ ] Dead/orphaned panes are cleaned up
- [ ] tmux version >= minimum documented requirement
- [ ] Multiple HUD instances prevented or handled
- [ ] External (manually created) sessions detected
- [ ] send-keys operations complete reliably
- [ ] Working directory correct for spawned sessions

---

## Sources Summary

### Primary (HIGH confidence)
- [tmux manual page](https://man7.org/linux/man-pages/man1/tmux.1.html) - Command reference
- [tmux GitHub issues](https://github.com/tmux/tmux/issues) - Known bugs and limitations
- [tmux FAQ](https://github.com/tmux/tmux/wiki/FAQ) - TERM settings, common issues

### Secondary (MEDIUM confidence)
- [tmux Advanced Use wiki](https://github.com/tmux/tmux/wiki/Advanced-Use) - Patterns
- [Super Guide to split-window](https://gist.github.com/sdondley/b01cc5bb1169c8c83401e438a652b84e) - Detailed subcommand reference
- [TmuxAI guides](https://tmuxai.dev/) - Working directories, respawn, FAQ

### Verified from Codebase
- Existing `tmuxService.ts` - Pane enumeration patterns
- Existing `jumpService.ts` - Session switching patterns
- Existing `useSessions.ts` - Process detection independent of tmux state
