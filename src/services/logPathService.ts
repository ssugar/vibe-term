import { readFileSync, readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';

/**
 * Inner message structure from Claude JSONL logs.
 */
export interface InnerMessage {
  model?: string;
  stop_reason?: 'end_turn' | 'tool_use' | 'max_tokens' | null;
  content?: Array<{ type: 'text' | 'tool_use' | 'tool_result' }>;
}

/**
 * Data wrapper containing the message info.
 */
export interface MessageData {
  message: {
    type: 'user' | 'assistant';
    timestamp: string;
    message: InnerMessage;
  };
}

/**
 * JSONL log entry structure (subset of fields needed for status detection).
 * Claude Code stores conversation transcripts in ~/.claude/projects/ as JSONL files.
 *
 * Actual structure:
 * - type: "progress" (top level)
 * - data.message.type: "user" | "assistant"
 * - data.message.timestamp: ISO timestamp
 * - data.message.message.model: full model name
 * - data.message.message.stop_reason: end_turn | tool_use | max_tokens | null
 */
export interface RawLogEntry {
  type: string;
  data?: MessageData;
}

/**
 * Normalized log entry for status detection.
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
 * Claude replaces '/' with '-' in paths for ~/.claude/projects/ directories.
 *
 * Example: /home/ssugar/claude/cc-tui-hud -> -home-ssugar-claude-cc-tui-hud
 *
 * @param projectPath - The project path to encode
 * @returns Hyphen-separated path string
 */
export function encodeProjectPath(projectPath: string): string {
  const normalized = resolve(projectPath);
  // Claude replaces '/' with '-' in project paths
  return normalized.replace(/\//g, '-');
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
 * Normalize a raw log entry to the simplified LogEntry format.
 * Handles the nested structure: type=progress -> data.message.type, etc.
 *
 * @param raw - Raw parsed JSONL entry
 * @returns Normalized LogEntry or null if not a valid message entry
 */
function normalizeEntry(raw: RawLogEntry): LogEntry | null {
  // Handle progress entries (the most common type)
  if (raw.type === 'progress' && raw.data?.message) {
    const msgData = raw.data.message;
    const entryType = msgData.type;

    // Only handle user/assistant types
    if (entryType !== 'user' && entryType !== 'assistant') {
      return null;
    }

    return {
      type: entryType,
      timestamp: msgData.timestamp,
      message: {
        model: msgData.message?.model,
        stop_reason: msgData.message?.stop_reason,
        content: msgData.message?.content,
      },
    };
  }

  // Handle summary entries (type is directly 'summary')
  if (raw.type === 'summary') {
    return {
      type: 'summary',
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Read and parse the last valid entry from a JSONL file.
 * Tries last few lines in case the final line is malformed (race condition during write).
 * Normalizes the nested structure to a flat LogEntry format.
 *
 * @param filePath - Path to the JSONL file
 * @returns Parsed and normalized LogEntry or null if unable to read/parse
 */
export function readLastEntry(filePath: string): LogEntry | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length === 0) return null;

    // Try last few lines in case last one is malformed (race condition during write)
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
      try {
        const raw = JSON.parse(lines[i]) as RawLogEntry;
        const normalized = normalizeEntry(raw);
        if (normalized) {
          return normalized;
        }
        // Entry was valid JSON but not a message type we care about, try previous
        continue;
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
