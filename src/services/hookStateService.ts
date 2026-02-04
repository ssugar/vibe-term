import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Session } from '../stores/types.js';

export interface HookSessionState {
  status: Session['status'];
  model: 'sonnet' | 'opus' | 'haiku' | null;
  cwd: string;
  sessionId: string;
  subagentCount: number;
  notification: string | null;
  transcriptPath: string | null;
  lastUpdate: string;
}

const STATE_DIR = path.join(os.homedir(), '.claude-hud', 'sessions');

/**
 * Read state file for a specific session ID
 */
export function readSessionState(sessionId: string): HookSessionState | null {
  try {
    const statePath = path.join(STATE_DIR, `${sessionId}.json`);
    if (!fs.existsSync(statePath)) {
      return null;
    }
    const content = fs.readFileSync(statePath, 'utf-8');
    const state = JSON.parse(content) as HookSessionState;
    return state;
  } catch {
    return null;
  }
}

/**
 * Check if two paths refer to the same project (one is a parent/child of the other).
 * Handles the case where hook CWD is a subdirectory (e.g., /project/infra)
 * but process CWD is the project root (e.g., /project).
 */
function pathsMatch(processCwd: string, stateCwd: string): boolean {
  // Normalize paths: remove trailing slashes for consistent comparison
  const normProcess = processCwd.replace(/\/+$/, '');
  const normState = stateCwd.replace(/\/+$/, '');

  // Exact match
  if (normProcess === normState) {
    return true;
  }

  // Process CWD is parent of state CWD (hook ran in subdirectory)
  // e.g., process=/project, state=/project/infra
  if (normState.startsWith(normProcess + '/')) {
    return true;
  }

  // State CWD is parent of process CWD (less common but handle it)
  // e.g., state=/project, process=/project/subdir
  if (normProcess.startsWith(normState + '/')) {
    return true;
  }

  return false;
}

/**
 * Find state by CWD (for sessions we detect by process but don't have hook session ID).
 * Uses prefix matching to handle subdirectory CWDs from subagents/tools.
 * When multiple sessions match the same CWD, returns the most recently updated one.
 */
export function findStateByPath(cwd: string): HookSessionState | null {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      return null;
    }
    const files = fs.readdirSync(STATE_DIR);
    let bestMatch: HookSessionState | null = null;
    let bestTime = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = fs.readFileSync(path.join(STATE_DIR, file), 'utf-8');
        const state = JSON.parse(content) as HookSessionState;
        // Match by cwd using prefix matching
        if (pathsMatch(cwd, state.cwd)) {
          // If multiple sessions match same CWD, prefer most recent
          const updateTime = state.lastUpdate ? new Date(state.lastUpdate).getTime() : 0;
          if (updateTime > bestTime) {
            bestMatch = state;
            bestTime = updateTime;
          }
        }
      } catch {
        continue;
      }
    }
    return bestMatch;
  } catch {
    return null;
  }
}

/**
 * Get status, model, subagent count, notification, and transcript path from hook state, falling back to defaults
 */
export function getHookBasedStatus(cwd: string): {
  status: Session['status'];
  model: 'sonnet' | 'opus' | 'haiku';
  subagentCount: number;
  notification: string | null;
  transcriptPath: string | null;
} {
  const state = findStateByPath(cwd);

  if (!state) {
    // No hook data yet - default to idle/sonnet/0
    return { status: 'idle', model: 'sonnet', subagentCount: 0, notification: null, transcriptPath: null };
  }

  // No staleness timeout - trust the hook state. Sessions clean up via SessionEnd hook,
  // and users may legitimately wait a long time on permission prompts.

  return {
    status: state.status || 'idle',
    model: state.model || 'sonnet',
    subagentCount: state.subagentCount || 0,
    notification: state.notification || null,
    transcriptPath: state.transcriptPath || null
  };
}

/**
 * Delete the session state file for a given project path.
 * Uses findStateByPath to locate the session, then removes the JSON file.
 *
 * @param cwd - The project path to find and delete state for
 */
export function deleteSessionState(cwd: string): void {
  try {
    const state = findStateByPath(cwd);
    if (!state) return;

    const statePath = path.join(STATE_DIR, `${state.sessionId}.json`);
    fs.unlinkSync(statePath);
  } catch {
    // File may already be deleted or inaccessible - that's fine
  }
}
