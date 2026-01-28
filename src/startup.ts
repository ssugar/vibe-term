import { spawnSync, SpawnSyncReturns } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * The managed tmux session name for vibe-term
 */
export const TMUX_SESSION_NAME = 'vibe-term';

/**
 * Result of startup orchestration
 */
export interface StartupResult {
  success: boolean;
  error?: string;
  shouldRenderInk: boolean;
}

/**
 * Information about the current tmux environment
 */
export interface TmuxEnvironment {
  inTmux: boolean;
  sessionName?: string;
}

/**
 * Check if tmux is installed and available.
 * Uses `tmux -V` to verify installation.
 */
export function checkTmuxAvailable(): boolean {
  const result: SpawnSyncReturns<Buffer> = spawnSync('tmux', ['-V']);
  return result.status === 0;
}

/**
 * Get information about the current tmux environment.
 * Checks if we're inside tmux and gets the session name if so.
 */
export function getTmuxEnvironment(): TmuxEnvironment {
  // Check TMUX environment variable to determine if we're inside tmux
  if (!process.env.TMUX) {
    return { inTmux: false };
  }

  // We're inside tmux - get the current session name
  const result = spawnSync('tmux', ['display-message', '-p', '#{session_name}']);
  const sessionName =
    result.status === 0 ? result.stdout.toString().trim() : undefined;

  return { inTmux: true, sessionName };
}

/**
 * Main startup orchestration function.
 * Ensures the application is running inside the managed `vibe-term` tmux session.
 *
 * Handles four scenarios:
 * 1. tmux not installed - returns error with install instructions
 * 2. Already in vibe-term session - proceed to render Ink
 * 3. Inside tmux but different session - switch-client to vibe-term
 * 4. Outside tmux - create/attach to vibe-term session
 *
 * @returns StartupResult indicating success/failure and whether to render Ink
 */
export function ensureTmuxEnvironment(): StartupResult {
  // 1. Check if tmux is available
  if (!checkTmuxAvailable()) {
    return {
      success: false,
      error: `tmux is not installed.

Install with:
  - Debian/Ubuntu: sudo apt install tmux
  - macOS: brew install tmux
  - Fedora: sudo dnf install tmux`,
      shouldRenderInk: false,
    };
  }

  // 2. Get current tmux environment
  const tmuxEnv = getTmuxEnvironment();

  // 3. If already in the vibe-term session, proceed to Ink
  if (tmuxEnv.inTmux && tmuxEnv.sessionName === TMUX_SESSION_NAME) {
    return { success: true, shouldRenderInk: true };
  }

  // 4. Check if vibe-term session already exists
  const hasSessionResult = spawnSync('tmux', [
    'has-session',
    '-t',
    TMUX_SESSION_NAME,
  ]);
  const sessionExists = hasSessionResult.status === 0;

  // 5. Handle case: inside tmux but in a different session
  if (tmuxEnv.inTmux) {
    if (sessionExists) {
      // Switch to existing vibe-term session
      const switchResult = spawnSync('tmux', [
        'switch-client',
        '-t',
        TMUX_SESSION_NAME,
      ]);
      if (switchResult.status !== 0) {
        return {
          success: false,
          error: `Failed to switch to ${TMUX_SESSION_NAME} session`,
          shouldRenderInk: false,
        };
      }
    } else {
      // Create detached session, then switch to it
      const createResult = spawnSync('tmux', [
        'new-session',
        '-d',
        '-s',
        TMUX_SESSION_NAME,
      ]);
      if (createResult.status !== 0) {
        return {
          success: false,
          error: `Failed to create ${TMUX_SESSION_NAME} session`,
          shouldRenderInk: false,
        };
      }

      const switchResult = spawnSync('tmux', [
        'switch-client',
        '-t',
        TMUX_SESSION_NAME,
      ]);
      if (switchResult.status !== 0) {
        return {
          success: false,
          error: `Failed to switch to ${TMUX_SESSION_NAME} session`,
          shouldRenderInk: false,
        };
      }
    }

    // After switch-client, we continue execution in the new session
    return { success: true, shouldRenderInk: true };
  }

  // 6. Handle case: outside tmux - create or attach to session
  // Use absolute paths to ensure command works inside tmux
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // Go up one level to project root (works for both src/ and dist/)
  const projectRoot = dirname(__dirname);
  const cliPath = join(projectRoot, 'dist', 'cli.js');

  // Quote path if it contains spaces
  const quotedCliPath = cliPath.includes(' ') ? `"${cliPath}"` : cliPath;
  const fullCommand = `node ${quotedCliPath}`;

  if (!sessionExists) {
    // Create new session WITH our CLI running inside it
    // Note: without -d, this creates AND attaches in one step
    spawnSync('tmux', ['new-session', '-s', TMUX_SESSION_NAME, fullCommand], {
      stdio: 'inherit',
    });
  } else {
    // Session already exists - check if HUD pane needs to be recreated
    // Count panes in the session
    const paneCountResult = spawnSync('tmux', [
      'list-panes',
      '-t',
      TMUX_SESSION_NAME,
      '-F',
      '#{pane_index}',
    ]);
    const paneCount = paneCountResult.stdout.toString().trim().split('\n').filter(Boolean).length;

    if (paneCount === 1) {
      // Only one pane exists - HUD pane was closed
      // Split to create HUD pane at top, then run HUD in it
      spawnSync('tmux', [
        'split-window',
        '-t',
        `${TMUX_SESSION_NAME}:0`,
        '-b',  // Before (above)
        '-l',
        '3',   // 3 lines for compact HUD
        fullCommand,
      ]);
    }

    // Attach to session (HUD is now running or was already running)
    spawnSync('tmux', ['attach', '-t', TMUX_SESSION_NAME], {
      stdio: 'inherit',
    });
  }

  // If we reach here, tmux exited (user detached or killed session)
  // Don't render Ink - just exit cleanly
  return { success: true, shouldRenderInk: false };
}
