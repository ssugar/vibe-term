import { execAsync } from './platform.js';

/**
 * Pane Session Manager
 *
 * Manages the mapping between Claude sessions and tmux panes.
 * Uses a "scratch window" pattern to hold inactive session panes,
 * and swap-pane to exchange visible content.
 *
 * Pane IDs and session mappings are stored in tmux environment variables
 * for persistence across process restarts.
 */

const TMUX_SESSION = 'claude-terminal';
const SCRATCH_WINDOW = 'scratch';

/**
 * Ensure the scratch window exists for storing inactive session panes.
 * Creates the window if it doesn't exist.
 *
 * @returns The window target "claude-terminal:scratch"
 */
export async function ensureScratchWindow(): Promise<string> {
  try {
    // Check if scratch window exists
    const { stdout } = await execAsync(
      `tmux list-windows -t ${TMUX_SESSION} -F '#{window_name}'`
    );

    if (!stdout.includes(SCRATCH_WINDOW)) {
      // Create scratch window (detached, won't switch to it)
      // Use colon suffix to auto-assign window index
      await execAsync(
        `tmux new-window -d -t ${TMUX_SESSION}: -n ${SCRATCH_WINDOW}`
      );
    }

    return `${TMUX_SESSION}:${SCRATCH_WINDOW}`;
  } catch (error) {
    // If session doesn't exist or other error, try to create anyway
    try {
      await execAsync(
        `tmux new-window -d -t ${TMUX_SESSION}: -n ${SCRATCH_WINDOW}`
      );
    } catch {
      // Window may already exist, ignore
    }
    return `${TMUX_SESSION}:${SCRATCH_WINDOW}`;
  }
}

/**
 * Create a new pane for a session in the scratch window.
 *
 * @param sessionId - The session ID to associate with the pane
 * @param projectPath - The working directory for the pane
 * @returns The pane ID (e.g., "%42")
 */
export async function createSessionPane(
  sessionId: string,
  projectPath: string
): Promise<string> {
  // Ensure scratch window exists
  const scratchWindow = await ensureScratchWindow();

  // Split in scratch window to create new pane
  // -P -F '#{pane_id}' returns the new pane's ID
  // -c sets the working directory
  const { stdout } = await execAsync(
    `tmux split-window -t ${scratchWindow} -P -F '#{pane_id}' -c "${projectPath}"`
  );
  const paneId = stdout.trim();

  // Store mapping: session ID -> pane ID
  // Using sanitized session ID for environment variable name
  const envKey = sanitizeEnvKey(sessionId);
  await execAsync(
    `tmux set-environment CLAUDE_PANE_${envKey} ${paneId}`
  );

  return paneId;
}

/**
 * Get the pane ID associated with a session.
 *
 * @param sessionId - The session ID to look up
 * @returns The pane ID or null if not found
 */
export async function getSessionPane(
  sessionId: string
): Promise<string | null> {
  try {
    const envKey = sanitizeEnvKey(sessionId);
    const { stdout } = await execAsync(
      `tmux show-environment CLAUDE_PANE_${envKey}`
    );

    // Output format: "CLAUDE_PANE_xxx=%NN" or "-CLAUDE_PANE_xxx" (if unset)
    if (stdout.startsWith('-')) {
      return null; // Variable is unset
    }

    const match = stdout.match(/=(.+)/);
    return match ? match[1].trim() : null;
  } catch {
    // Variable not set or tmux error
    return null;
  }
}

/**
 * Switch to a session by swapping its pane into the main pane area.
 *
 * @param sessionId - The session ID to switch to
 * @param mainPaneId - The main pane ID to swap into
 * @returns Result object with success status and optional error
 */
export async function switchToSession(
  sessionId: string,
  mainPaneId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get target session's pane
    const targetPaneId = await getSessionPane(sessionId);

    if (!targetPaneId) {
      return {
        success: false,
        error: `No pane found for session ${sessionId}`,
      };
    }

    // Swap target pane with main pane
    // After swap, target's content is now in main pane location
    await execAsync(
      `tmux swap-pane -s ${targetPaneId} -t ${mainPaneId}`
    );

    // Update active session tracking
    await execAsync(
      `tmux set-environment CLAUDE_ACTIVE_SESSION ${sessionId}`
    );

    // Focus main pane (now showing target session)
    await execAsync(`tmux select-pane -t ${mainPaneId}`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get the currently active session ID.
 *
 * @returns The active session ID or null if none
 */
export async function getActiveSessionId(): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `tmux show-environment CLAUDE_ACTIVE_SESSION`
    );

    // Output format: "CLAUDE_ACTIVE_SESSION=xxx" or "-CLAUDE_ACTIVE_SESSION" (if unset)
    if (stdout.startsWith('-')) {
      return null; // Variable is unset
    }

    const match = stdout.match(/=(.+)/);
    return match ? match[1].trim() : null;
  } catch {
    // Variable not set or tmux error
    return null;
  }
}

/**
 * Sanitize a session ID for use in tmux environment variable names.
 * Replaces non-alphanumeric characters with underscores.
 */
function sanitizeEnvKey(sessionId: string): string {
  return sessionId.replace(/[^a-zA-Z0-9]/g, '_');
}
