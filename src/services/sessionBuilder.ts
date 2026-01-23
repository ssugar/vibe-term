import type { ClaudeProcess } from './processDetector.js';
import { getProcessCwd } from './platform.js';
import { isProcessInTmux, type TmuxPane } from './tmuxService.js';
import { getHookBasedStatus } from './hookStateService.js';
import type { Session } from '../stores/types.js';

/**
 * Extract display name from project path with disambiguation.
 * If folder name appears in multiple paths, prepend parent folder.
 *
 * @param projectPath - Full path to project
 * @param allPaths - All project paths for duplicate detection
 * @returns Display name (folder or parent/folder)
 */
export function extractProjectName(
  projectPath: string,
  allPaths: string[]
): string {
  // Extract folder name (last segment)
  const segments = projectPath.split('/').filter(Boolean);
  const folderName = segments[segments.length - 1] || projectPath;

  // Check for duplicates (same folder name in different paths)
  const duplicates = allPaths.filter((p) => {
    const segs = p.split('/').filter(Boolean);
    return segs[segs.length - 1] === folderName && p !== projectPath;
  });

  // If duplicate, prepend parent folder for disambiguation
  if (duplicates.length > 0 && segments.length >= 2) {
    const parentFolder = segments[segments.length - 2];
    return `${parentFolder}/${folderName}`;
  }

  return folderName;
}

/**
 * Sort sessions with stable ordering.
 * - Existing sessions maintain their relative order
 * - New sessions are added at end, sorted by startedAt (oldest first)
 *
 * @param sessions - Sessions to sort
 * @param previousOrder - Array of session IDs from previous cycle
 * @returns Sorted sessions array
 */
export function sortSessions(
  sessions: Session[],
  previousOrder: string[]
): Session[] {
  const previousOrderSet = new Set(previousOrder);

  // Separate into existing (in previous order) and new sessions
  const existing: Session[] = [];
  const newSessions: Session[] = [];

  for (const session of sessions) {
    if (previousOrderSet.has(session.id)) {
      existing.push(session);
    } else {
      newSessions.push(session);
    }
  }

  // Sort existing by their position in previousOrder
  existing.sort((a, b) => {
    const aIdx = previousOrder.indexOf(a.id);
    const bIdx = previousOrder.indexOf(b.id);
    return aIdx - bIdx;
  });

  // Sort new sessions by startedAt (oldest first)
  newSessions.sort(
    (a, b) => a.startedAt.getTime() - b.startedAt.getTime()
  );

  return [...existing, ...newSessions];
}

/**
 * Sort sessions with blocked at top, then stable ordering for rest.
 * - Blocked sessions sorted by startedAt (oldest first = most urgent)
 * - Non-blocked sessions maintain stable ordering from previous cycle
 *
 * @param sessions - Sessions to sort
 * @param previousOrder - Array of session IDs from previous cycle
 * @returns Sorted sessions array with blocked at top
 */
export function sortSessionsWithBlocked(
  sessions: Session[],
  previousOrder: string[]
): Session[] {
  // Separate into blocked and non-blocked
  const blocked: Session[] = [];
  const nonBlocked: Session[] = [];

  for (const session of sessions) {
    if (session.status === 'blocked') {
      blocked.push(session);
    } else {
      nonBlocked.push(session);
    }
  }

  // Sort blocked by startedAt ascending (oldest blocked first = most urgent)
  blocked.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  // Sort non-blocked using existing stable ordering logic
  const sortedNonBlocked = sortSessions(nonBlocked, previousOrder);

  return [...blocked, ...sortedNonBlocked];
}

/**
 * Build Session objects from detected Claude processes.
 * Enriches raw process data with project names, tmux context, and duration.
 *
 * @param processes - Detected Claude processes
 * @param panes - Available tmux panes
 * @param previousOrder - Previous session order for stability
 * @returns Promise resolving to sorted sessions
 */
export async function buildSessions(
  processes: ClaudeProcess[],
  panes: TmuxPane[],
  previousOrder: string[]
): Promise<Session[]> {
  // Get CWDs for all processes in parallel
  const cwdResults = await Promise.all(
    processes.map(async (proc) => ({
      process: proc,
      cwd: await getProcessCwd(proc.pid),
    }))
  );

  // Filter out processes where CWD couldn't be determined
  const validResults = cwdResults.filter(
    (r): r is { process: ClaudeProcess; cwd: string } => r.cwd !== null
  );

  // Collect all paths for duplicate detection
  const allPaths = validResults.map((r) => r.cwd);

  // Build Session objects
  const sessions: Session[] = validResults.map(({ process, cwd }) => {
    // Calculate startedAt from elapsed seconds
    const startedAt = new Date(Date.now() - process.elapsedSeconds * 1000);

    // Check tmux context using parent PID
    const tmuxInfo = isProcessInTmux(process.ppid, panes);

    // Get status, model, and subagent count from hook state files
    const { status, model, subagentCount } = getHookBasedStatus(cwd);

    return {
      id: `claude-${process.pid}`,
      pid: process.pid,
      projectPath: cwd,
      projectName: extractProjectName(cwd, allPaths),
      status,
      contextUsage: 0,                 // Phase 4 will detect
      model: model ?? 'sonnet',        // Default to sonnet if unknown
      subagentCount,
      startedAt,
      lastActivity: new Date(),
      inTmux: tmuxInfo.inTmux,
      tmuxTarget: tmuxInfo.tmuxTarget,
    };
  });

  // Sort with blocked at top, then stable ordering for rest
  return sortSessionsWithBlocked(sessions, previousOrder);
}
