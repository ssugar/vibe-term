import { execAsync } from './platform.js';
import { focusTerminalWindow } from './windowFocusService.js';
import type { Session } from '../stores/types.js';

export interface JumpResult {
  success: boolean;
  message: string;
}

/**
 * Jump to a Claude session's terminal.
 *
 * For tmux sessions:
 * - If HUD is inside tmux: use switch-client to switch to session's pane
 * - If HUD is not in tmux: attach-session (takes over current terminal)
 *
 * For non-tmux sessions:
 * - Attempt to focus the terminal window via platform-specific methods
 */
export async function jumpToSession(session: Session): Promise<JumpResult> {
  // Non-tmux sessions: try to focus the terminal window
  if (!session.inTmux || !session.tmuxTarget) {
    const result = await focusTerminalWindow(session);
    return {
      success: result.success,
      message: result.hint
        ? `${result.message}. ${result.hint}`
        : result.message,
    };
  }

  try {
    const isHudInTmux = !!process.env.TMUX;

    // Parse session name from target (format: "session:window.pane")
    const colonIdx = session.tmuxTarget.indexOf(':');
    const sessionName = colonIdx > 0
      ? session.tmuxTarget.substring(0, colonIdx)
      : session.tmuxTarget;

    if (isHudInTmux) {
      // switch-client changes current tmux client to target session
      await execAsync(`tmux switch-client -t "${sessionName}"`);
      // Then select the specific window.pane
      await execAsync(`tmux select-window -t "${session.tmuxTarget}"`);

      return { success: true, message: `Switched to ${session.projectName}` };
    } else {
      // Not in tmux: attach-session will take over this terminal
      // This effectively exits the HUD
      await execAsync(`tmux attach-session -t "${sessionName}"`);
      return { success: true, message: `Attached to ${session.projectName}` };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Common case: session no longer exists
    if (msg.includes('no session') || msg.includes("can't find")) {
      return {
        success: false,
        message: `Session no longer exists: ${session.projectName}`,
      };
    }
    return {
      success: false,
      message: `Jump failed: ${msg}`,
    };
  }
}
