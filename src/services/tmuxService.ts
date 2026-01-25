import { execAsync } from './platform.js';

/**
 * Represents a tmux pane with its identifying information
 */
export interface TmuxPane {
  sessionName: string;
  windowIndex: number;
  paneIndex: number;
  panePid: number;
  target: string; // "session:window.pane" format for tmux commands
}

/**
 * Result of checking if a process is running in tmux
 */
export interface TmuxInfo {
  inTmux: boolean;
  tmuxTarget?: string;
}

/**
 * Get all tmux panes across all sessions.
 * Returns empty array if tmux is not running or has no sessions.
 */
export async function getTmuxPanes(): Promise<TmuxPane[]> {
  try {
    // tmux list-panes -a: list all panes across all sessions
    // Format: "session:window.pane pane_pid"
    const { stdout } = await execAsync(
      'tmux list-panes -a -F "#{session_name}:#{window_index}.#{pane_index} #{pane_pid}"'
    );

    return stdout
      .trim()
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        // Parse "session:window.pane pid"
        const parts = line.trim().split(' ');
        if (parts.length < 2) return null;

        const target = parts[0];
        const panePid = parseInt(parts[1], 10);

        // Parse target: "session:window.pane"
        const colonIdx = target.lastIndexOf(':');
        const dotIdx = target.lastIndexOf('.');

        if (colonIdx === -1 || dotIdx === -1) return null;

        const sessionName = target.substring(0, colonIdx);
        const windowIndex = parseInt(target.substring(colonIdx + 1, dotIdx), 10);
        const paneIndex = parseInt(target.substring(dotIdx + 1), 10);

        return {
          sessionName,
          windowIndex,
          paneIndex,
          panePid,
          target,
        };
      })
      .filter((p): p is TmuxPane => p !== null);
  } catch {
    // tmux not running or no sessions
    return [];
  }
}

/**
 * Check if a process is running in a tmux pane.
 * Compares the process's parent PID (ppid) against tmux pane shell PIDs.
 *
 * @param ppid - The parent process ID of the Claude process
 * @param panes - Pre-fetched list of tmux panes (to avoid re-querying)
 * @returns TmuxInfo with inTmux flag and optional tmuxTarget
 */
export function isProcessInTmux(ppid: number, panes: TmuxPane[]): TmuxInfo {
  // Check if the parent process is a tmux pane shell
  const matchingPane = panes.find((pane) => pane.panePid === ppid);

  if (matchingPane) {
    return {
      inTmux: true,
      tmuxTarget: matchingPane.target,
    };
  }

  return { inTmux: false };
}

/**
 * Convenience function to get just the tmux target string.
 * Returns undefined if the process is not in tmux.
 *
 * @param ppid - The parent process ID of the Claude process
 * @param panes - Pre-fetched list of tmux panes
 * @returns tmux target string ("session:window.pane") or undefined
 */
export function getTmuxTarget(
  ppid: number,
  panes: TmuxPane[]
): string | undefined {
  const info = isProcessInTmux(ppid, panes);
  return info.tmuxTarget;
}

/**
 * Configure tmux session options for claude-terminal.
 * Options are scoped to the specific session (not global).
 * Should be called after session creation/attachment.
 */
export async function configureSession(sessionName: string): Promise<void> {
  const options = [
    // Disable status bar - HUD replaces it
    `set-option -t ${sessionName} status off`,
    // Enable mouse for pane selection/scrolling
    `set-option -t ${sessionName} mouse on`,
    // Fast escape time for responsive key handling
    `set-option -t ${sessionName} escape-time 0`,
    // Increase history limit
    `set-option -t ${sessionName} history-limit 10000`,
  ];

  for (const opt of options) {
    await execAsync(`tmux ${opt}`);
  }
}

/**
 * Result of HUD layout creation
 */
export interface HudLayout {
  hudPaneId: string;
  mainPaneId: string;
}

/**
 * Create the HUD pane layout within the current window.
 * Creates a fixed-height pane at top or bottom for the HUD strip.
 *
 * @param position - 'top' or 'bottom' for HUD placement
 * @param height - Number of lines for HUD pane (1-3)
 * @returns Pane IDs for HUD and main panes
 */
export async function createHudLayout(
  position: 'top' | 'bottom',
  height: number
): Promise<HudLayout> {
  // Get current pane ID (will become main pane after split)
  const { stdout: currentPane } = await execAsync(
    `tmux display-message -p '#{pane_id}'`
  );

  // Split options:
  // -v: vertical split (top/bottom)
  // -b: place new pane before (above) - used for top position
  // -l N: exact line height
  // -P -F: print new pane ID
  const splitArgs =
    position === 'top' ? `-v -b -l ${height}` : `-v -l ${height}`;

  const { stdout: hudPane } = await execAsync(
    `tmux split-window ${splitArgs} -P -F '#{pane_id}'`
  );

  // After split:
  // - For top: new pane (HUD) is above, current pane (main) is below
  // - For bottom: new pane (HUD) is below, current pane (main) is above

  return {
    hudPaneId: hudPane.trim(),
    mainPaneId: currentPane.trim(),
  };
}
