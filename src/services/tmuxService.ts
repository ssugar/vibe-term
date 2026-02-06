import { execAsync } from './platform.js';

/**
 * Represents a tmux pane with its identifying information
 */
export interface TmuxPane {
  sessionName: string;
  windowIndex: number;
  paneIndex: number;
  panePid: number;
  paneId: string; // Stable pane ID like "%10" (doesn't change on swap)
  target: string; // "session:window.pane" format for tmux commands
}

/**
 * Result of checking if a process is running in tmux
 */
export interface TmuxInfo {
  inTmux: boolean;
  tmuxTarget?: string;
  paneId?: string; // Stable pane ID for swapping
}

/**
 * Get all tmux panes across all sessions.
 * Returns empty array if tmux is not running or has no sessions.
 */
export async function getTmuxPanes(): Promise<TmuxPane[]> {
  try {
    // tmux list-panes -a: list all panes across all sessions
    // Format: "session:window.pane pane_pid pane_id"
    const { stdout } = await execAsync(
      'tmux list-panes -a -F "#{session_name}:#{window_index}.#{pane_index} #{pane_pid} #{pane_id}"'
    );

    return stdout
      .trim()
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        // Parse "session:window.pane pid pane_id"
        const parts = line.trim().split(' ');
        if (parts.length < 3) return null;

        const target = parts[0];
        const panePid = parseInt(parts[1], 10);
        const paneId = parts[2]; // Like "%10"

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
          paneId,
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
      paneId: matchingPane.paneId,
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
 *
 * @param sessionName - The tmux session name
 * @param cliPath - Absolute path to the CLI script (for attach hook)
 */
export async function configureSession(
  sessionName: string,
  cliPath?: string
): Promise<void> {
  const options = [
    // Disable status bar - HUD replaces it
    `set-option -t ${sessionName} status off`,
    // Enable mouse for pane selection/scrolling
    `set-option -t ${sessionName} mouse on`,
    // Fast escape time for responsive key handling
    `set-option -t ${sessionName} escape-time 0`,
    // Increase history limit
    `set-option -t ${sessionName} history-limit 10000`,
    // Use largest client size for all windows (including unviewed scratch window)
    // This prevents "no space for new pane" errors when scratch window would
    // otherwise be sized smaller than the active client
    `set-option -t ${sessionName} window-size largest`,
  ];

  for (const opt of options) {
    await execAsync(`tmux ${opt}`);
  }

  // Add keybindings that work regardless of which pane is focused
  // -n flag means no prefix key needed
  const bindings = [
    // Ctrl+\\ to detach (keep session alive)
    `bind-key -n C-\\\\ detach-client`,
  ];

  for (const bind of bindings) {
    await execAsync(`tmux ${bind}`);
  }

  // Set up client-attached hook to recreate HUD when someone uses `tmux attach`
  // This ensures the HUD pane exists even if user attaches directly via tmux
  if (cliPath) {
    // Quote the path if it contains spaces
    const quotedPath = cliPath.includes(' ') ? `"${cliPath}"` : cliPath;
    const hudCommand = `node ${quotedPath}`;

    // Hook: when client attaches, check if only 1 pane exists (HUD closed)
    // If so, split to create HUD pane at top with 3 lines
    // The if-shell checks pane count; only creates HUD if needed
    const hookCmd = `set-hook -t ${sessionName} client-attached 'if-shell "[ #{window_panes} -eq 1 ]" "split-window -b -l 3 \\"${hudCommand}\\""'`;

    try {
      await execAsync(`tmux ${hookCmd}`);
    } catch {
      // Hook setup failed - not critical, manual attach just won't auto-create HUD
      console.error('Warning: Failed to set up client-attached hook');
    }
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
 * The HUD (current process) stays in a small pane, main area is created for sessions.
 *
 * If layout already exists (2+ panes), just ensures proper sizing and keybindings.
 *
 * @param position - 'top' or 'bottom' for HUD placement
 * @param height - Number of lines for HUD pane (1-3)
 * @returns Pane IDs for HUD and main panes
 */
export async function createHudLayout(
  position: 'top' | 'bottom',
  height: number
): Promise<HudLayout> {
  // Get current pane ID (this is where HUD is running - it will stay here)
  const { stdout: hudPane } = await execAsync(
    `tmux display-message -p '#{pane_id}'`
  );

  // Check how many panes exist in current window
  const { stdout: paneList } = await execAsync(
    `tmux list-panes -F '#{pane_id}'`
  );
  const panes = paneList.trim().split('\n').filter(Boolean);

  let mainPane: string;

  if (panes.length >= 2) {
    // Layout already exists (e.g., from reattach) - find the other pane
    mainPane = panes.find((p) => p !== hudPane.trim()) || panes[1];

    // Just resize HUD pane to ensure correct height
    await execAsync(`tmux resize-pane -t ${hudPane.trim()} -y ${height}`);
  } else {
    // Need to create the layout - split to create main pane
    // Strategy: Create a new pane for the main area, then resize HUD pane to be small.
    // The HUD stays in the current pane; the new pane becomes the main session area.

    // Split to create main pane:
    // -v: vertical split (top/bottom)
    // For top HUD: split below us (no -b flag)
    // For bottom HUD: split above us (-b flag)
    const splitArgs = position === 'top' ? '-v' : '-v -b';

    const { stdout: newPane } = await execAsync(
      `tmux split-window ${splitArgs} -P -F '#{pane_id}'`
    );
    mainPane = newPane.trim();

    // Now resize our pane (the HUD pane) to the desired height
    // -t targets our pane, -y sets the height in lines
    await execAsync(`tmux resize-pane -t ${hudPane.trim()} -y ${height}`);
  }

  // Store pane IDs in tmux environment for keybindings and session management
  await execAsync(
    `tmux set-environment CLAUDE_TERMINAL_HUD_PANE ${hudPane.trim()}`
  );
  await execAsync(
    `tmux set-environment CLAUDE_TERMINAL_MAIN_PANE ${mainPane.trim()}`
  );

  // Add keybindings to focus HUD pane
  // Ctrl+g: legacy "go to HUD" binding
  // Ctrl+h: new "H for HUD" mnemonic (easier to remember)
  // Both work from any pane (-n = no prefix needed)
  await execAsync(
    `tmux bind-key -n C-g select-pane -t ${hudPane.trim()}`
  );
  await execAsync(
    `tmux bind-key -n C-h select-pane -t ${hudPane.trim()}`
  );

  // Alt+1-9: Quick jump to session N from any pane (including HUD)
  // Sends number key + Enter to HUD, which triggers selection + switch
  // The HUD's switchToSession will focus the main pane after swapping
  // Uses M- (Meta) prefix for Alt key, run-shell to chain commands
  for (let i = 1; i <= 9; i++) {
    await execAsync(
      `tmux bind-key -n M-${i} run-shell "tmux send-keys -t ${hudPane.trim()} ${i} && tmux send-keys -t ${hudPane.trim()} Enter"`
    );
  }

  // Display welcome message in main pane (only on fresh layout creation)
  // Uses a command that displays the welcome and waits silently (hiding bash prompt)
  if (panes.length < 2) {
    // Welcome script: clear, show art, then wait silently with read
    // When a session is spawned, this pane gets swapped out
    const welcomeScript = `clear; cat << 'WELCOME'

  ╔═══════════════════════════════════════════════════════════════╗
  ║                                                               ║
  ║         ██╗   ██╗██╗██████╗ ███████╗                          ║
  ║         ██║   ██║██║██╔══██╗██╔════╝                          ║
  ║         ██║   ██║██║██████╔╝█████╗══                          ║
  ║         ╚██╗ ██╔╝██║██╔══██╗██╔════╝                          ║
  ║          ╚████╔╝ ██║██████╔╝███████╗                          ║
  ║           ╚═══╝  ╚═╝╚═════╝ ╚══════╝                          ║
  ║                    ████████╗███████╗██████╗ ███╗   ███╗       ║
  ║                    ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║       ║
  ║                       ██║   █████╗  ██████╔╝██╔████╔██║       ║
  ║                       ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║       ║
  ║                       ██║   ███████╗██║  ██║██║ ╚═╝ ██║       ║
  ║                       ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝       ║
  ║                                                               ║
  ║          Your AI-powered terminal session manager             ║
  ║                                                               ║
  ║   Press n in HUD to spawn a new Claude session                ║
  ║   1-9 to jump to session | Ctrl+h to focus HUD                ║
  ║   Press ? for help | q to quit                                ║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝

WELCOME
read -s`;

    // Send welcome script to main pane
    // Use bash -c to run the multi-line script
    const escapedScript = welcomeScript.replace(/'/g, "'\\''");
    await execAsync(
      `tmux send-keys -t ${mainPane} 'bash -c '"'"'${escapedScript}'"'"'' Enter`
    );
  }

  // Select the HUD pane so user starts with focus on navigation
  await execAsync(`tmux select-pane -t ${hudPane.trim()}`);

  return {
    hudPaneId: hudPane.trim(),
    mainPaneId: mainPane.trim(),
  };
}

/**
 * Resize the HUD pane to the specified height.
 * Used for dynamic height changes (e.g., expand when focused).
 *
 * @param height - Number of lines for HUD pane
 */
export async function resizeHudPane(height: number): Promise<void> {
  try {
    const { stdout } = await execAsync('tmux show-environment CLAUDE_TERMINAL_HUD_PANE');
    const hudPaneId = stdout.split('=')[1]?.trim();
    if (hudPaneId) {
      await execAsync(`tmux resize-pane -t ${hudPaneId} -y ${height}`);
    }
  } catch {
    // Silently ignore resize failures (e.g., pane doesn't exist)
  }
}
