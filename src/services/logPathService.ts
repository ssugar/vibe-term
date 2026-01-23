import { readFileSync, readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';

/**
 * JSONL log entry structure (subset of fields needed for status detection).
 * Claude Code stores conversation transcripts in ~/.claude/projects/ as JSONL files.
 */
export interface LogEntry {
  type: 'user' | 'assistant' | 'summary';
  timestamp: string;
  message?: {
    model?: string;
    stop_reason?: 'end_turn' | 'tool_use' | 'max_tokens' | null;
    content?: Array<{ type: 'text' | 'tool_use' | 'tool_result' }>;
  };
}

/**
 * Encode a project path to match Claude's directory naming scheme.
 * Claude uses base64url encoding for project paths in ~/.claude/projects/
 *
 * @param projectPath - The project path to encode
 * @returns base64url encoded string
 */
export function encodeProjectPath(projectPath: string): string {
  const normalized = resolve(projectPath);
  return Buffer.from(normalized).toString('base64url');
}

/**
 * Find the most recently modified JSONL log file for a project.
 * Claude stores logs in ~/.claude/projects/{encoded-path}/*.jsonl
 *
 * @param projectPath - Full path to the project
 * @returns Path to most recent JSONL file, or null if not found
 */
export function findLatestLogFile(projectPath: string): string | null {
  const claudeProjectsDir = join(homedir(), '.claude', 'projects');
  const encodedPath = encodeProjectPath(projectPath);
  const projectLogDir = join(claudeProjectsDir, encodedPath);

  try {
    const files = readdirSync(projectLogDir)
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => {
        const fullPath = join(projectLogDir, f);
        return {
          path: fullPath,
          mtime: statSync(fullPath).mtimeMs,
        };
      })
      .sort((a, b) => b.mtime - a.mtime); // Most recent first

    return files.length > 0 ? files[0].path : null;
  } catch {
    // Directory doesn't exist or can't be read - graceful degradation
    return null;
  }
}

/**
 * Read and parse the last valid entry from a JSONL file.
 * Tries last few lines in case the final line is malformed (race condition during write).
 *
 * @param filePath - Path to the JSONL file
 * @returns Parsed LogEntry or null if unable to read/parse
 */
export function readLastEntry(filePath: string): LogEntry | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length === 0) return null;

    // Try last few lines in case last one is malformed (race condition during write)
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
      try {
        return JSON.parse(lines[i]) as LogEntry;
      } catch {
        // Parse failed, try previous line
        continue;
      }
    }

    return null;
  } catch {
    // File doesn't exist or can't be read - graceful degradation
    return null;
  }
}
