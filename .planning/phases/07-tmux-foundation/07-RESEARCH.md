# Phase 7: tmux Foundation - Research

**Researched:** 2026-01-25
**Domain:** tmux session management and startup orchestration from Node.js
**Confidence:** HIGH

## Summary

Phase 7 implements the foundational tmux infrastructure for claude-terminal: creating/attaching to a managed tmux session, setting up a 2-line HUD pane at the top, and configuring session-specific tmux options. The core challenge is startup orchestration - determining the current environment (inside/outside tmux) and taking the appropriate action (create session, attach to existing, or switch client).

**Key findings:**
- tmux CLI commands via `child_process.spawnSync` with `stdio: 'inherit'` is the correct approach for startup (before Ink renders)
- The `$TMUX` environment variable reliably indicates if we're already inside tmux
- Session-specific options (status bar, mouse, keybindings) should use `set-option` without `-g` flag to scope to our session only
- The `-l` flag on `split-window` sets exact line count (not percentage) for the HUD pane
- `tmux new-session -A -s name` automatically creates or attaches (single command pattern)

**Primary recommendation:** Implement startup as a synchronous pre-Ink phase that ensures tmux environment before rendering. Use `spawnSync` with `stdio: 'inherit'` to hand off terminal control to tmux attach/new-session.

## Standard Stack

### Core (No new dependencies)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| tmux | 3.0+ | Terminal multiplexer | System-installed, native reliability per PROJECT.md |
| child_process.spawnSync | Node.js built-in | Run tmux commands synchronously during startup | Blocks until tmux attached, no npm dependency |
| execAsync (existing) | In platform.ts | Async tmux commands after startup | Already used in v1.0 for tmux operations |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| process.env.TMUX | Node.js built-in | Detect if inside tmux | Startup decision: attach vs switch-client |
| fs.existsSync | Node.js built-in | Check config file existence | Load user config from ~/.config/claude-terminal/config.json |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| spawnSync | exec with callback | spawnSync blocks correctly for startup; exec would require complex async flow before Ink |
| Manual TMUX check | is-tmux npm package | Zero-dep check is trivial (`process.env.TMUX`); is-tmux adds unnecessary dependency |
| node-tmux library | Direct CLI | node-tmux lacks pane operations; CLI via execAsync already proven in v1.0 |

**Installation:**
```bash
# No npm packages needed
# Ensure tmux is installed on system:
tmux -V  # Should be 3.0+
```

## Architecture Patterns

### Recommended Project Structure

```
src/
  cli.tsx              # Entry point - calls startup, then renders Ink
  startup.ts           # NEW: Pre-Ink startup orchestration
  services/
    platform.ts        # EXISTING: execAsync function
    tmuxService.ts     # EXISTING: Extend with session management
    configService.ts   # NEW: Load ~/.config/claude-terminal/config.json
  components/
    App.tsx            # EXISTING: Main Ink component (modified in later phases)
```

### Pattern 1: Startup Orchestration

**What:** Synchronous startup phase that ensures tmux environment before Ink renders

**When to use:** Always - this is the core Phase 7 pattern

**Example:**
```typescript
// src/startup.ts
import { spawnSync } from 'child_process';

const TMUX_SESSION_NAME = 'claude-terminal';

interface StartupResult {
  success: boolean;
  error?: string;
}

export function ensureTmuxEnvironment(): StartupResult {
  // 1. Check if tmux is available
  const tmuxCheck = spawnSync('tmux', ['-V']);
  if (tmuxCheck.status !== 0) {
    return {
      success: false,
      error: 'tmux is not installed. Install with: apt install tmux (Debian/Ubuntu) or brew install tmux (macOS)',
    };
  }

  // 2. Check if already in the claude-terminal session
  const currentSession = process.env.TMUX
    ? getCurrentTmuxSession()
    : null;

  if (currentSession === TMUX_SESSION_NAME) {
    // Already in our session - proceed to Ink
    return { success: true };
  }

  // 3. Check if session exists
  const hasSession = spawnSync('tmux', ['has-session', '-t', TMUX_SESSION_NAME]);
  const sessionExists = hasSession.status === 0;

  // 4. Handle based on current environment
  if (process.env.TMUX) {
    // Inside tmux but different session - switch client
    const switchResult = spawnSync('tmux', ['switch-client', '-t', TMUX_SESSION_NAME], {
      stdio: 'inherit',
    });
    // switch-client doesn't replace process; we continue execution
    // Ink will render in the now-switched session
    return switchResult.status === 0
      ? { success: true }
      : { success: false, error: 'Failed to switch to claude-terminal session' };
  } else {
    // Outside tmux - create or attach
    // This REPLACES the current process (like exec)
    const args = sessionExists
      ? ['attach-session', '-t', TMUX_SESSION_NAME]
      : ['new-session', '-s', TMUX_SESSION_NAME];

    spawnSync('tmux', args, { stdio: 'inherit' });
    // If we reach here, tmux exited (user detached/killed)
    process.exit(0);
  }
}

function getCurrentTmuxSession(): string | null {
  const result = spawnSync('tmux', ['display-message', '-p', '#{session_name}']);
  return result.status === 0 ? result.stdout.toString().trim() : null;
}
```

**Source:** [Node.js child_process docs](https://nodejs.org/api/child_process.html), [tmux man page](https://man.openbsd.org/tmux.1)

### Pattern 2: Session-Specific tmux Configuration

**What:** Apply tmux options only to the claude-terminal session, not globally

**When to use:** After session creation/attachment, before HUD renders

**Example:**
```typescript
// src/services/tmuxService.ts (extension)
import { execAsync } from './platform.js';

const SESSION_NAME = 'claude-terminal';

export async function configureSession(): Promise<void> {
  // Disable status bar for this session only
  await execAsync(`tmux set-option -t ${SESSION_NAME} status off`);

  // Enable mouse for this session
  await execAsync(`tmux set-option -t ${SESSION_NAME} mouse on`);

  // Increase history limit
  await execAsync(`tmux set-option -t ${SESSION_NAME} history-limit 10000`);

  // Set escape-time to 0 for responsive key handling
  await execAsync(`tmux set-option -t ${SESSION_NAME} escape-time 0`);
}
```

**Note:** Using `-t session_name` scopes options to that session. Omitting `-g` avoids affecting global config.

**Source:** [tmux set-option documentation](https://man.openbsd.org/tmux.1#set-option)

### Pattern 3: Fixed-Height Pane Creation

**What:** Create HUD pane with exact line height (2 lines)

**When to use:** During session initialization for HUD layout

**Example:**
```typescript
// Create HUD pane at top with exactly 2 lines
export async function createHudLayout(): Promise<{ hudPaneId: string; mainPaneId: string }> {
  // Split window: create pane above (-b) with 2 lines (-l 2)
  // -P -F prints new pane ID
  const { stdout: hudPane } = await execAsync(
    `tmux split-window -b -l 2 -P -F '#{pane_id}'`
  );

  // Get the main pane ID (the original pane, now below HUD)
  const { stdout: mainPane } = await execAsync(
    `tmux display-message -p '#{pane_id}'`
  );

  return {
    hudPaneId: hudPane.trim(),
    mainPaneId: mainPane.trim(),
  };
}
```

**Source:** [tmux split-window guide](https://gist.github.com/sdondley/b01cc5bb1169c8c83401e438a652b84e)

### Pattern 4: Quit Behavior with Detach/Kill Prompt

**What:** On quit (q key), prompt user to detach (keep session) or kill (cleanup)

**When to use:** Exit handler in Ink app

**Example:**
```typescript
// In App.tsx or dedicated quit handler
import { useInput, useApp } from 'ink';

function useQuitHandler() {
  const { exit } = useApp();
  const [confirmingQuit, setConfirmingQuit] = useState(false);

  useInput((input, key) => {
    if (input === 'q') {
      setConfirmingQuit(true);
    }

    if (confirmingQuit) {
      if (input === 'd') {
        // Detach: session stays alive
        spawnSync('tmux', ['detach-client'], { stdio: 'inherit' });
        exit();
      } else if (input === 'k') {
        // Kill: cleanup completely
        spawnSync('tmux', ['kill-session', '-t', 'claude-terminal'], { stdio: 'inherit' });
        exit();
      } else if (key.escape || input === 'n') {
        setConfirmingQuit(false);
      }
    }
  });

  return confirmingQuit;
}
```

**Note:** This is Phase 7 scope (basic quit). Full quit prompt UX may be refined in later phases.

### Anti-Patterns to Avoid

- **Using `-g` flag for session options:** Don't use `set-option -g` - this affects ALL tmux sessions. Use `-t session_name` to scope to our session.

- **Spawning tmux as detached child process:** Don't use `spawn('tmux', [...], { detached: true })`. For attach/new-session, we want the terminal to be handed to tmux directly using `stdio: 'inherit'`.

- **Async startup with Ink rendering race:** Don't use `exec` (async) for startup tmux operations and immediately call Ink render. Use `spawnSync` to ensure tmux environment exists before Ink starts.

- **Modifying user's ~/.tmux.conf:** Don't write to user's tmux config. Apply options at runtime with `-t session_name` scope.

- **Nested tmux sessions:** Don't try to create tmux session from inside another tmux session. Check `$TMUX` and use `switch-client` instead.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Check if in tmux | Parse TMUX env manually | `process.env.TMUX` truthy check | TMUX env var is undefined outside tmux, set inside |
| Get current session name | Parse TMUX env var format | `tmux display-message -p '#{session_name}'` | tmux format strings are authoritative |
| Create/attach in one command | Separate has-session + branch | `tmux new-session -A -s name` | `-A` flag does create-or-attach automatically |
| Terminal handoff to tmux | Complex pty management | `spawnSync(..., { stdio: 'inherit' })` | Node.js built-in handles terminal correctly |

**Key insight:** tmux CLI commands are the correct abstraction. Node.js libraries for tmux (node-tmux, stmux) either lack features or replace tmux entirely. Direct CLI via child_process is proven reliable in v1.0.

## Common Pitfalls

### Pitfall 1: split-window Size Not Honored in Detached Sessions

**What goes wrong:** When using `tmux new-session -d` (detached) and then `split-window -l 2`, the size may not be honored correctly because there's no client attached to determine terminal dimensions.

**Why it happens:** tmux needs a client to know the terminal size. Detached sessions have no size until a client attaches.

**How to avoid:** Create the session, attach to it, THEN create splits. Or create splits after ensuring a client is attached.

**Warning signs:** HUD pane has wrong height, or tmux shows "can't split-window" errors.

**Source:** [GitHub issue tmux#3060](https://github.com/tmux/tmux/issues/3060)

### Pitfall 2: Nested tmux Session Warning

**What goes wrong:** Error message "sessions should be nested with care, unset $TMUX to force" when trying to create/attach from inside tmux.

**Why it happens:** tmux blocks nested sessions by default to prevent confusion.

**How to avoid:** Check `process.env.TMUX` before deciding action. If inside tmux, use `switch-client` instead of `attach-session` or `new-session`.

**Warning signs:** User complains they can't start claude-terminal from their existing tmux session.

**Source:** [tmux GitHub issue #3124](https://github.com/tmux/tmux/issues/3124)

### Pitfall 3: exec vs spawn vs spawnSync for Terminal Handoff

**What goes wrong:** Using `exec` or `spawn` without `stdio: 'inherit'` results in tmux not receiving terminal input, or output not displaying.

**Why it happens:** By default, child_process creates pipes for stdio. For interactive terminal apps like tmux, we need the child to inherit the parent's terminal.

**How to avoid:** Use `spawnSync('tmux', args, { stdio: 'inherit' })` for startup operations where we want tmux to take over the terminal.

**Warning signs:** Blank terminal, tmux hangs, or keyboard input doesn't work.

**Source:** [Node.js child_process docs](https://nodejs.org/api/child_process.html)

### Pitfall 4: Session Options Not Persisting

**What goes wrong:** tmux options (status off, mouse on) seem to work but are lost on next attach.

**Why it happens:** Options set without `-g` or `-t` only apply to the current session temporarily.

**How to avoid:** Always specify `-t session_name` for session-specific options. Consider calling `configureSession()` after every attach, not just creation.

**Warning signs:** Status bar reappears after detach/reattach.

### Pitfall 5: Config File Race Condition

**What goes wrong:** Config file is read before it exists, or default config isn't created.

**Why it happens:** First-time users won't have ~/.config/claude-terminal/config.json.

**How to avoid:** Check if config exists. If not, use built-in defaults (don't require config file). Optionally create default config on first run.

**Warning signs:** Crash on first run, or options not taking effect.

## Code Examples

Verified patterns from official sources and existing codebase:

### Detect tmux Environment

```typescript
// Source: Standard pattern from tmux documentation
function getTmuxInfo(): { inTmux: boolean; sessionName?: string } {
  if (!process.env.TMUX) {
    return { inTmux: false };
  }

  // Get current session name
  const result = spawnSync('tmux', ['display-message', '-p', '#{session_name}']);
  const sessionName = result.status === 0
    ? result.stdout.toString().trim()
    : undefined;

  return { inTmux: true, sessionName };
}
```

### Create or Attach to Session (One Command)

```typescript
// Source: tmux man page - new-session -A flag
// -A: Attach to session if it exists, create if it doesn't
spawnSync('tmux', ['new-session', '-A', '-s', 'claude-terminal'], {
  stdio: 'inherit',
});
// Terminal is now controlled by tmux
// This line only executes after tmux exits (detach/kill)
process.exit(0);
```

### Switch Client (From Inside tmux)

```typescript
// Source: tmux man page - switch-client command
// Used when already in a tmux session but want to switch to different session
const result = spawnSync('tmux', ['switch-client', '-t', 'claude-terminal']);
if (result.status !== 0) {
  // Session doesn't exist, need to create it
  // Can't use new-session from inside tmux; need to create detached then switch
  spawnSync('tmux', ['new-session', '-d', '-s', 'claude-terminal']);
  spawnSync('tmux', ['switch-client', '-t', 'claude-terminal']);
}
```

### Create Fixed-Height Pane

```typescript
// Source: tmux split-window guide
// -v: vertical split (top/bottom)
// -b: place new pane before (above) current
// -l 2: exactly 2 lines height
// -P -F: print pane ID in specified format
const { stdout } = await execAsync(
  `tmux split-window -v -b -l 2 -P -F '#{pane_id}'`
);
const hudPaneId = stdout.trim(); // e.g., "%5"
```

### Session-Scoped Options

```typescript
// Source: tmux set-option documentation
// -t session: scope to specific session (don't use -g)
async function configureSession(sessionName: string): Promise<void> {
  const commands = [
    `tmux set-option -t ${sessionName} status off`,
    `tmux set-option -t ${sessionName} mouse on`,
    `tmux set-option -t ${sessionName} escape-time 0`,
  ];

  for (const cmd of commands) {
    await execAsync(cmd);
  }
}
```

### Check Terminal Size

```typescript
// Source: Standard pattern for terminal size warning
function checkTerminalSize(): { width: number; height: number; warning?: string } {
  const width = process.stdout.columns || 80;
  const height = process.stdout.rows || 24;

  let warning: string | undefined;
  if (height < 10) {
    warning = `Terminal height (${height} rows) is very small. HUD may not display correctly.`;
  }

  return { width, height, warning };
}
```

### Config File Loading

```typescript
// Source: XDG Base Directory Specification + Node.js fs
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

interface Config {
  hudPosition: 'top' | 'bottom';
  hudHeight: 1 | 2 | 3;
}

const DEFAULT_CONFIG: Config = {
  hudPosition: 'top',
  hudHeight: 2,
};

function loadConfig(): Config {
  const configPath = join(homedir(), '.config', 'claude-terminal', 'config.json');

  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    // Invalid JSON or read error - use defaults
    return DEFAULT_CONFIG;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| node-tmux library | Direct CLI via child_process | v1.0 decision | No dependency on poorly maintained library |
| Embedded terminal (node-pty) | tmux splits | v2.0 decision (PROJECT.md) | Native reliability, less complexity |
| Global tmux config changes | Session-scoped options | Best practice | Doesn't affect user's other tmux sessions |

**Deprecated/outdated:**
- **node-tmux npm package:** Only 8 GitHub stars, lacks pane operations. Not recommended.
- **tmux -CC (control mode):** Designed for GUI terminal emulators (iTerm2). Overkill for our CLI-to-CLI integration.

## Open Questions

### 1. Exact tmux Options to Set

**What we know:** Per CONTEXT.md, Claude has discretion over exact options. Common options include status, mouse, escape-time.

**What's unclear:** Full list of options, whether to disable tmux prefix key in our session.

**Recommendation:** Start with minimal set (status off, mouse on, escape-time 0). Add more based on user feedback. Document configurable options.

### 2. Small Terminal Warning Behavior

**What we know:** Per CONTEXT.md, show warning for terminals <10 rows but proceed anyway.

**What's unclear:** Exact warning message, where to display it (stderr before Ink? In HUD strip?)

**Recommendation:** Display warning to stderr before Ink starts: `Warning: Terminal has only ${rows} rows. HUD may not display correctly.` Then proceed.

### 3. Config File Schema

**What we know:** Location is `~/.config/claude-terminal/config.json`. hudPosition and hudHeight are configurable.

**What's unclear:** Full schema, validation approach, migration strategy.

**Recommendation:** Simple flat JSON object with known keys. Ignore unknown keys for forward compatibility. Type defaults:
```json
{
  "hudPosition": "top",
  "hudHeight": 2
}
```

## Sources

### Primary (HIGH confidence)

- [tmux man page (OpenBSD)](https://man.openbsd.org/tmux.1) - Authoritative command reference for new-session, attach-session, switch-client, split-window, set-option
- [Node.js child_process documentation](https://nodejs.org/api/child_process.html) - spawn, spawnSync, stdio options
- [Super Guide to split-window](https://gist.github.com/sdondley/b01cc5bb1169c8c83401e438a652b84e) - Detailed split-window patterns including -l for line count
- Existing v1.0 codebase - `src/services/tmuxService.ts`, `src/services/platform.ts` (execAsync pattern)

### Secondary (MEDIUM confidence)

- [tmux GitHub issues](https://github.com/tmux/tmux/issues) - Pitfall documentation (nested sessions, split-window sizing)
- [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html) - Config file location convention
- v2.0 milestone research - `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`

### Tertiary (LOW confidence)

- [node-tmux GitHub](https://github.com/StarlaneStudios/node-tmux) - Evaluated for reference, not used (limited API)
- [tmux cheatsheets](https://tmuxcheatsheet.com/) - Quick reference, not authoritative

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - No new dependencies, tmux CLI is stable and well-documented
- Architecture: HIGH - Builds on v1.0 patterns, startup flow is straightforward
- Pitfalls: HIGH - Well-documented in tmux issues and community

**Research date:** 2026-01-25
**Valid until:** 2026-03-25 (60 days - stable domain, tmux commands haven't changed significantly in years)
