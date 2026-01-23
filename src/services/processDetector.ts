import { execAsync } from './platform.js';

/**
 * Represents a detected Claude process
 */
export interface ClaudeProcess {
  pid: number;
  ppid: number;
  elapsedSeconds: number;
  args: string;
}

/**
 * Find all running Claude processes.
 * Uses ps command with grep to find processes starting with "claude" followed by
 * a space (has args) or end of line (no args). The [c] trick prevents grep from
 * matching itself.
 *
 * Returns empty array if no processes found or command fails.
 */
export async function findClaudeProcesses(): Promise<ClaudeProcess[]> {
  try {
    // ps -eo pid,ppid,etimes,args returns:
    //   pid: process ID
    //   ppid: parent process ID
    //   etimes: elapsed time in seconds
    //   args: full command line
    // The [c] in "[c]laude" prevents grep from matching itself
    const { stdout } = await execAsync(
      'ps -eo pid,ppid,etimes,args | grep -E "[c]laude( |$)"'
    );

    return stdout
      .trim()
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const trimmed = line.trim();
        // Match: PID PPID ETIMES ARGS...
        const match = trimmed.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
        if (!match) return null;
        return {
          pid: parseInt(match[1], 10),
          ppid: parseInt(match[2], 10),
          elapsedSeconds: parseInt(match[3], 10),
          args: match[4],
        };
      })
      .filter((p): p is ClaudeProcess => p !== null && p.args.includes('claude'));
  } catch {
    // No processes found or command failed
    return [];
  }
}
