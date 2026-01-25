import { detectPlatform, execAsync } from './platform.js';
import type { Session } from '../stores/types.js';

/**
 * Result of a window focus operation
 */
export interface FocusResult {
  success: boolean;
  message: string;
  hint?: string; // Installation hint on failure
}

/**
 * Known terminal emulator process names
 */
const TERMINAL_EMULATORS = [
  'gnome-terminal',
  'xterm',
  'konsole',
  'alacritty',
  'kitty',
  'terminator',
  'tilix',
  'urxvt',
  'st',
  'xfce4-terminal',
  'mate-terminal',
  'lxterminal',
  'terminology',
  'guake',
  'tilda',
  'wezterm',
];

/**
 * Check if running on Wayland display server
 * Wayland does not support window focus manipulation like X11
 */
function isWayland(): boolean {
  return (
    !!process.env.WAYLAND_DISPLAY ||
    process.env.XDG_SESSION_TYPE === 'wayland'
  );
}

/**
 * Check if a command exists on the system
 */
async function hasCommand(cmd: string): Promise<boolean> {
  try {
    await execAsync(`which ${cmd}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get parent PID for a given process
 */
async function getParentPid(pid: number): Promise<number | null> {
  const plat = detectPlatform();
  try {
    if (plat === 'linux' || plat === 'wsl2') {
      // Read from /proc filesystem
      const { stdout } = await execAsync(`cat /proc/${pid}/stat`);
      // stat format: pid (comm) state ppid ...
      // PPID is the 4th field
      const match = stdout.match(/^\d+\s+\([^)]+\)\s+\S+\s+(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    } else {
      // macOS: use ps
      const { stdout } = await execAsync(`ps -o ppid= -p ${pid}`);
      const ppid = parseInt(stdout.trim(), 10);
      return isNaN(ppid) ? null : ppid;
    }
  } catch {
    // Process may not exist or no permission
  }
  return null;
}

/**
 * Get process name for a given PID
 */
async function getProcessName(pid: number): Promise<string | null> {
  const plat = detectPlatform();
  try {
    if (plat === 'linux' || plat === 'wsl2') {
      // Read from /proc filesystem - comm contains process name
      const { stdout } = await execAsync(`cat /proc/${pid}/comm`);
      return stdout.trim() || null;
    } else {
      // macOS: use ps
      const { stdout } = await execAsync(`ps -o comm= -p ${pid}`);
      // ps on macOS returns full path; extract basename
      const fullPath = stdout.trim();
      const parts = fullPath.split('/');
      return parts[parts.length - 1] || null;
    }
  } catch {
    // Process may not exist
  }
  return null;
}

/**
 * Check if a process name matches a known terminal emulator
 */
function isTerminalEmulator(name: string): boolean {
  const lowerName = name.toLowerCase();
  return TERMINAL_EMULATORS.some(t => lowerName.includes(t));
}

/**
 * Walk up the process tree from Claude PID to find the terminal emulator PID
 */
async function findTerminalPid(claudePid: number): Promise<number | null> {
  let currentPid = claudePid;
  const maxDepth = 10;

  for (let i = 0; i < maxDepth; i++) {
    const ppid = await getParentPid(currentPid);
    if (!ppid || ppid === 1) break;

    const processName = await getProcessName(ppid);
    if (processName && isTerminalEmulator(processName)) {
      return ppid;
    }
    currentPid = ppid;
  }
  return null;
}

/**
 * Focus a terminal window on Linux (X11 only)
 * Uses xdotool for window search and activation
 */
async function focusLinuxWindow(session: Session): Promise<FocusResult> {
  // Check for Wayland first - xdotool cannot work on Wayland
  if (isWayland()) {
    return {
      success: false,
      message: 'Window focus not supported on Wayland',
      hint: 'Switch to X11 session or use tmux for session jumping',
    };
  }

  // Check for xdotool
  if (!(await hasCommand('xdotool'))) {
    return {
      success: false,
      message: 'Cannot focus: xdotool not found',
      hint: 'Install with: sudo apt install xdotool',
    };
  }

  // Try PID-based search first
  const terminalPid = await findTerminalPid(session.pid);
  if (terminalPid) {
    try {
      // windowactivate is more reliable than windowfocus
      // It switches desktops if needed
      await execAsync(
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
  } catch {
    return {
      success: false,
      message: `Window not found for ${session.projectName}`,
    };
  }
}

/**
 * Focus Terminal.app on macOS using AppleScript
 * Note: This focuses the app, not a specific tab
 */
async function focusMacWindow(session: Session): Promise<FocusResult> {
  // osascript is built-in on macOS, no need to check
  const script = `
    tell application "Terminal"
      reopen
      activate
    end tell
  `;

  try {
    await execAsync(`osascript -e '${script}'`);
    return {
      success: true,
      message: `Focused Terminal (${session.projectName})`,
    };
  } catch {
    return {
      success: false,
      message: 'Failed to focus Terminal.app',
      hint: 'Only Terminal.app is supported on macOS',
    };
  }
}

/**
 * Focus Windows Terminal from WSL2 using PowerShell
 * Uses SetForegroundWindow API
 */
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
  [User32]::ShowWindowAsync($hwnd, 9) | Out-Null
  [User32]::SetForegroundWindow($hwnd) | Out-Null
  exit 0
}
exit 1
`;

  // Escape the script for shell execution
  // Replace newlines with semicolons, escape quotes
  const escapedScript = psScript
    .trim()
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, ' ');

  try {
    await execAsync(
      `powershell.exe -NoProfile -Command "${escapedScript}"`,
      // Note: timeout is not supported by current execAsync, but we document the intent
    );
    return {
      success: true,
      message: `Focused Windows Terminal (${session.projectName})`,
    };
  } catch {
    return {
      success: false,
      message: 'Failed to focus Windows Terminal',
      hint: 'Ensure Windows Terminal is running',
    };
  }
}

/**
 * Focus the terminal window containing a Claude session.
 * Dispatches to platform-specific implementation.
 *
 * @param session - The session to focus
 * @returns FocusResult with success status and message
 */
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
