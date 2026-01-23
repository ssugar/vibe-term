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
 */
export function findStateByPath(cwd: string): HookSessionState | null {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      return null;
    }
    const files = fs.readdirSync(STATE_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = fs.readFileSync(path.join(STATE_DIR, file), 'utf-8');
        const state = JSON.parse(content) as HookSessionState;
        // Match by cwd using prefix matching
        if (pathsMatch(cwd, state.cwd)) {
          return state;
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get status, model, subagent count, and notification from hook state, falling back to defaults
 */
export function getHookBasedStatus(cwd: string): {
  status: Session['status'];
  model: 'sonnet' | 'opus' | 'haiku';
  subagentCount: number;
  notification: string | null;
} {
  const state = findStateByPath(cwd);

  if (!state) {
    // No hook data yet - default to idle/sonnet/0
    return { status: 'idle', model: 'sonnet', subagentCount: 0, notification: null };
  }

  // Check if state is stale (older than 5 minutes = probably dead session)
  const lastUpdate = new Date(state.lastUpdate);
  const now = new Date();
  const ageMs = now.getTime() - lastUpdate.getTime();
  const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

  if (ageMs > STALE_THRESHOLD_MS) {
    // Stale data, default to idle
    return { status: 'idle', model: state.model || 'sonnet', subagentCount: 0, notification: null };
  }

  return {
    status: state.status || 'idle',
    model: state.model || 'sonnet',
    subagentCount: state.subagentCount || 0,
    notification: state.notification || null
  };
}
