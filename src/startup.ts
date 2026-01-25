import { spawnSync, SpawnSyncReturns } from 'child_process';

/**
 * The managed tmux session name for claude-terminal
 */
export const TMUX_SESSION_NAME = 'claude-terminal';

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
 * Ensures the application is running inside the managed `claude-terminal` tmux session.
 *
 * Handles four scenarios:
 * 1. tmux not installed - returns error with install instructions
 * 2. Already in claude-terminal session - proceed to render Ink
 * 3. Inside tmux but different session - switch-client to claude-terminal
 * 4. Outside tmux - create/attach to claude-terminal session
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

  // 3. If already in the claude-terminal session, proceed to Ink
  if (tmuxEnv.inTmux && tmuxEnv.sessionName === TMUX_SESSION_NAME) {
    return { success: true, shouldRenderInk: true };
  }

  // 4. Check if claude-terminal session already exists
  const hasSessionResult = spawnSync('tmux', [
    'has-session',
    '-t',
    TMUX_SESSION_NAME,
  ]);
  const sessionExists = hasSessionResult.status === 0;

  // 5. Handle case: inside tmux but in a different session
  if (tmuxEnv.inTmux) {
    if (sessionExists) {
      // Switch to existing claude-terminal session
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
  // Use -A flag: attach if exists, create if not
  // This hands off terminal control to tmux with stdio: 'inherit'
  spawnSync('tmux', ['new-session', '-A', '-s', TMUX_SESSION_NAME], {
    stdio: 'inherit',
  });

  // If we reach here, tmux exited (user detached or killed session)
  // Don't render Ink - just exit cleanly
  return { success: true, shouldRenderInk: false };
}
