# Phase 6: Terminal Integration - Research

**Researched:** 2026-01-25
**Domain:** Cross-platform terminal window focus (X11, macOS, WSL2)
**Confidence:** MEDIUM (platform-specific details verified, edge cases remain)

## Summary

This phase adds window focus capabilities for non-tmux Claude sessions across three platforms: Linux (X11), macOS, and WSL2. Phase 5 already handles tmux session jumping via `tmux switch-client`. This phase extends focus to regular terminal windows.

The research confirms that window focus is possible but platform-specific, with varying reliability:
- **Linux (X11)**: `xdotool` is the standard tool, with `windowactivate` being more reliable than `windowfocus`
- **macOS**: AppleScript via `osascript` can activate Terminal.app windows
- **WSL2**: PowerShell with `SetForegroundWindow` API can focus Windows Terminal, but reliability varies

**Primary recommendation:** Use shell commands (`xdotool`, `osascript`, `powershell.exe`) via `execAsync()` with runtime dependency detection. Start with PID-based window search, fall back to title matching, and provide clear installation hints on failure.

## Standard Stack

This phase uses CLI tools, not npm packages. The existing codebase pattern of shell commands via `execAsync()` continues.

### Core Tools by Platform

| Platform | Tool | Version | Purpose | Why Standard |
|----------|------|---------|---------|--------------|
| Linux (X11) | xdotool | 4.x | Window search and activation | De facto standard for X11 automation |
| macOS | osascript | (built-in) | AppleScript execution | Native macOS scripting interface |
| WSL2 | powershell.exe | (built-in) | SetForegroundWindow API | Windows interop from WSL2 |

### Supporting Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| wmctrl | Alternative window control | If xdotool unavailable, more reliable with window IDs |
| xprop | Query window properties | Debug, verify _NET_WM_PID support |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| xdotool | wmctrl | wmctrl lacks --pid search, requires manual window ID lookup |
| xdotool | ydotool | Works on Wayland but cannot focus windows, only input simulation |
| shell commands | npm packages | No maintained cross-platform window focus packages exist |

**Note on Wayland:** xdotool does not work on Wayland due to security restrictions. Wayland removed the X11 APIs that enable window manipulation. Detection should check display server and provide appropriate error message.

## Architecture Patterns

### Recommended Project Structure

```
src/services/
├── jumpService.ts          # Existing (Phase 5 tmux jumping)
├── windowFocusService.ts   # NEW: Non-tmux window focus
└── platform.ts             # Existing platform detection
```

### Pattern 1: Platform-Specific Focus Strategy

**What:** Dispatch to platform-specific focus implementations
**When to use:** Always, as focus mechanisms differ completely by platform

```typescript
// Source: Research synthesis
export interface FocusResult {
  success: boolean;
  message: string;
  hint?: string;  // Installation hint on failure
}

export async function focusTerminalWindow(
  session: Session
): Promise<FocusResult> {
  const platform = detectPlatform();

  switch (platform) {
    case 'linux':
      return focusLinuxWindow(session);
    case 'macos':
      return focusMacWindow(session);
    case 'wsl2':
      return focusWsl2Window(session);
  }
}
```

### Pattern 2: PID Tracing with Fallback

**What:** Trace process tree from Claude PID up to terminal, fall back to title matching
**When to use:** For finding which window owns a Claude process

```typescript
// Source: Research synthesis from ps/pstree patterns
async function findTerminalPid(claudePid: number): Promise<number | null> {
  // Walk up process tree looking for terminal emulator
  let currentPid = claudePid;
  const maxDepth = 10;

  for (let i = 0; i < maxDepth; i++) {
    const ppid = await getParentPid(currentPid);
    if (!ppid || ppid === 1) break;

    const processName = await getProcessName(ppid);
    if (isTerminalEmulator(processName)) {
      return ppid;
    }
    currentPid = ppid;
  }
  return null;
}

function isTerminalEmulator(name: string): boolean {
  const terminals = [
    'gnome-terminal', 'xterm', 'konsole', 'alacritty',
    'kitty', 'terminator', 'tilix', 'urxvt', 'st'
  ];
  return terminals.some(t => name.includes(t));
}
```

### Pattern 3: Runtime Dependency Detection

**What:** Check if required tool exists before attempting use
**When to use:** Before calling platform-specific focus commands

```typescript
// Source: Research synthesis
async function hasCommand(cmd: string): Promise<boolean> {
  try {
    await execAsync(`which ${cmd}`);
    return true;
  } catch {
    return false;
  }
}

async function checkLinuxDependencies(): Promise<{
  available: boolean;
  tool?: string;
  installHint?: string;
}> {
  if (await hasCommand('xdotool')) {
    return { available: true, tool: 'xdotool' };
  }
  if (await hasCommand('wmctrl')) {
    return { available: true, tool: 'wmctrl' };
  }
  return {
    available: false,
    installHint: 'Install with: apt install xdotool',
  };
}
```

### Anti-Patterns to Avoid

- **Caching window IDs:** Windows can close/reopen; always scan fresh on each jump
- **Assuming _NET_WM_PID exists:** Not all applications set this X11 property
- **Ignoring Wayland:** Must detect and provide clear error, not silent failure
- **Blocking on window operations:** Use `--sync` with xdotool but have reasonable timeout

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| X11 window search | Custom X11 bindings | xdotool CLI | Edge cases, protocol complexity |
| macOS window control | Custom Cocoa bindings | osascript | Requires Objective-C/Swift |
| Windows API calls | Custom FFI | powershell.exe | Cross-process complexity |
| Process tree walking | Recursive /proc parsing | ps with PPID column | Already implemented in platform.ts |

**Key insight:** Shell commands are the right abstraction level for this problem. Node.js packages for window manipulation are unmaintained or non-existent. CLI tools have years of edge-case handling built in.

## Common Pitfalls

### Pitfall 1: Wayland Incompatibility

**What goes wrong:** xdotool silently fails or produces errors on Wayland
**Why it happens:** Wayland removed X11 APIs for security; xdotool cannot see windows
**How to avoid:** Detect display server type before attempting X11 operations
**Warning signs:** `WAYLAND_DISPLAY` env var is set, `XDG_SESSION_TYPE=wayland`

```typescript
// Detection pattern
function isWayland(): boolean {
  return (
    !!process.env.WAYLAND_DISPLAY ||
    process.env.XDG_SESSION_TYPE === 'wayland'
  );
}
```

### Pitfall 2: _NET_WM_PID Not Set

**What goes wrong:** `xdotool search --pid` returns no results
**Why it happens:** Some terminal emulators don't set this X11 property
**How to avoid:** Fall back to window title matching when PID search fails
**Warning signs:** Search returns empty for known-running application

### Pitfall 3: SetForegroundWindow Security Restrictions

**What goes wrong:** PowerShell SetForegroundWindow call has no effect
**Why it happens:** Windows blocks focus stealing for security; requires recent user input
**How to avoid:** Add small delay, ensure process isn't elevated, document limitation
**Warning signs:** Function returns true but window doesn't come to front

### Pitfall 4: Multiple Windows Match

**What goes wrong:** PID search returns multiple window IDs (tabs, child windows)
**Why it happens:** Terminal emulators may create multiple X11 windows
**How to avoid:** User decision was "focus first match" - document this behavior
**Warning signs:** `xdotool search --pid` returns multiple lines

### Pitfall 5: HUD Focus Lost on Jump

**What goes wrong:** Jumping to another window loses ability to return to HUD
**Why it happens:** HUD terminal window loses focus, user has no easy return path
**How to avoid:** Before jumping, save HUD's window ID for potential restoration
**Warning signs:** User requested "quick return to HUD" as core value

## Code Examples

### Linux (X11) Focus with xdotool

```typescript
// Source: xdotool manpage verified via Arch manual pages
async function focusLinuxWindow(session: Session): Promise<FocusResult> {
  // Check for Wayland first
  if (isWayland()) {
    return {
      success: false,
      message: 'Window focus not supported on Wayland',
      hint: 'Switch to X11 session or use tmux',
    };
  }

  // Check for xdotool
  const deps = await checkLinuxDependencies();
  if (!deps.available) {
    return {
      success: false,
      message: 'Cannot focus: xdotool not found',
      hint: deps.installHint,
    };
  }

  // Try PID-based search first
  const terminalPid = await findTerminalPid(session.pid);
  if (terminalPid) {
    try {
      // windowactivate is more reliable than windowfocus
      // It switches desktops if needed
      const { stdout } = await execAsync(
        `xdotool search --pid ${terminalPid} windowactivate`
      );
      return { success: true, message: `Focused ${session.projectName}` };
    } catch {
      // Fall through to title matching
    }
  }

  // Fallback: title matching with project name
  try {
    await execAsync(
      `xdotool search --name "${session.projectName}" windowactivate`
    );
    return { success: true, message: `Focused ${session.projectName}` };
  } catch (error) {
    return {
      success: false,
      message: `Window not found for ${session.projectName}`,
    };
  }
}
```

### macOS Focus with osascript

```typescript
// Source: AppleScript Terminal.app documentation, MacScripter forums
async function focusMacWindow(session: Session): Promise<FocusResult> {
  // Try to focus Terminal.app (only supported terminal per user decision)
  const script = `
    tell application "Terminal"
      reopen
      activate
    end tell
  `;

  try {
    await execAsync(`osascript -e '${script}'`);
    return { success: true, message: `Focused Terminal` };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to focus Terminal.app',
      hint: 'Only Terminal.app is supported on macOS',
    };
  }
}
```

**Note:** macOS AppleScript `activate` brings all Terminal windows to front. Focusing a specific tab requires knowing the window index, which is not easily correlated with PID. The implementation focuses the app, not the specific tab.

### WSL2 Focus via PowerShell

```typescript
// Source: GitHub gist lalibi/3762289efc5805f8cfcf, IDERA PowerTips
async function focusWsl2Window(session: Session): Promise<FocusResult> {
  // PowerShell script to focus Windows Terminal
  const psScript = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class User32 {
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
'@
$proc = Get-Process -Name "WindowsTerminal" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($proc) {
  $hwnd = $proc.MainWindowHandle
  [User32]::ShowWindowAsync($hwnd, 9) | Out-Null  # SW_RESTORE
  [User32]::SetForegroundWindow($hwnd) | Out-Null
  exit 0
}
exit 1
`;

  try {
    await execAsync(
      `powershell.exe -NoProfile -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
      { timeout: 5000 }
    );
    return { success: true, message: 'Focused Windows Terminal' };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to focus Windows Terminal',
      hint: 'Ensure Windows Terminal is running',
    };
  }
}
```

### Quick Return to HUD Pattern

```typescript
// Source: Research synthesis for user's core value
let hudWindowId: string | null = null;

async function saveHudWindowId(): Promise<void> {
  if (detectPlatform() === 'linux' && !isWayland()) {
    try {
      const { stdout } = await execAsync('xdotool getactivewindow');
      hudWindowId = stdout.trim();
    } catch {
      hudWindowId = null;
    }
  }
}

async function returnToHud(): Promise<FocusResult> {
  if (!hudWindowId) {
    return { success: false, message: 'HUD window ID not saved' };
  }

  try {
    await execAsync(`xdotool windowactivate ${hudWindowId}`);
    return { success: true, message: 'Returned to HUD' };
  } catch {
    return { success: false, message: 'Failed to return to HUD' };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| wmctrl + xprop | xdotool | 2015+ | Single tool for search + activate |
| X11-only | X11 with Wayland detection | 2020+ | Must handle Wayland gracefully |
| xdotool windowfocus | xdotool windowactivate | Always | windowactivate handles desktops |

**Deprecated/outdated:**
- `xdotool --title`: Deprecated, use `--name` instead
- Focus simulation on Wayland: Not possible, Wayland design decision

## Open Questions

### 1. Specific Tab Focus on macOS

- **What we know:** AppleScript `activate` brings all Terminal windows to front
- **What's unclear:** How to focus specific tab containing Claude process
- **Recommendation:** Accept app-level focus; document limitation. Could enhance later with window title matching if Terminal.app includes path in title.

### 2. Windows Terminal Tab Identification

- **What we know:** PowerShell can focus Windows Terminal app
- **What's unclear:** How to switch to specific tab within Windows Terminal from WSL2
- **Recommendation:** Focus the app; specific tab focus may not be possible from WSL2 context.

### 3. Quick Return to HUD Implementation

- **What we know:** Can save window ID before jump, restore with windowactivate
- **What's unclear:** Best UX - keybinding? Auto-return timer? User-triggered?
- **Recommendation:** Per context, implement keybinding (discretionary implementation detail). Save window ID on HUD startup, provide 'b' key for "back to HUD".

## Sources

### Primary (HIGH confidence)

- [xdotool Arch manual pages](https://man.archlinux.org/man/xdotool.1.en) - Command reference, limitations
- [wmctrl Linux man page](https://linux.die.net/man/1/wmctrl) - Alternative tool reference
- [PowerShell SetForegroundWindow GitHub Gist](https://gist.github.com/lalibi/3762289efc5805f8cfcf) - Windows API pattern

### Secondary (MEDIUM confidence)

- [X11 Window ID by PID article](https://www.duskopijetlovic.com/x11/xorg/xterm/cli/terminal/shell/howto/sysadmin/unix/2024/08/10/xorg-x11-window-id-by-process-id.html) - PID to window ID mapping
- [MacScripter Terminal focus thread](https://www.macscripter.net/t/bring-window-to-front/50313) - AppleScript patterns
- [IDERA PowerTips](https://blog.idera.com/database-tools/bringing-window-in-the-foreground) - SetForegroundWindow usage

### Tertiary (LOW confidence)

- WebSearch results on Wayland alternatives - ydotool cannot do window focus
- Community reports on SetForegroundWindow reliability - varies by Windows version

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - CLI tools are well-documented and stable
- Architecture: MEDIUM - Platform-specific edge cases may need iteration
- Pitfalls: HIGH - Well-documented X11 vs Wayland split, API limitations

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable domain, infrequent changes)
