import * as fs from 'fs';

// All Claude 4.x models use 200K standard context window
const CONTEXT_WINDOW_SIZE = 200_000;

// Read last N bytes for performance (transcript files can be 10-20MB)
const READ_TAIL_BYTES = 50_000;

// Cache to avoid re-parsing unchanged files
interface CacheEntry {
  mtime: number;
  percentage: number;
}
const cache = new Map<string, CacheEntry>();

/**
 * Usage data from Claude API response
 */
interface Usage {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
}

/**
 * JSONL entry structure (from Claude Code transcripts)
 *
 * Actual format is nested:
 * - Top level: type: "progress", isSidechain: boolean
 * - Nested: data.message.type: "assistant", data.message.message.usage: {...}
 */
interface JsonlEntry {
  type: string;  // "progress", "user", etc at top level
  isSidechain?: boolean;
  data?: {
    message?: {
      type?: string;  // "assistant", "user", etc
      message?: {
        usage?: Usage;
      };
    };
  };
}

/**
 * Extract usage data from a JSONL entry if it's a valid assistant entry
 */
function extractUsage(entry: unknown): Usage | null {
  if (typeof entry !== 'object' || entry === null) return null;

  const e = entry as JsonlEntry;

  // Must not be sidechain (subagent context is separate)
  if (e.isSidechain === true) return null;

  // Navigate to nested assistant message with usage
  const nestedMessage = e.data?.message;
  if (!nestedMessage) return null;

  // Must be assistant type at nested level
  if (nestedMessage.type !== 'assistant') return null;

  // Get usage from nested message.message.usage
  const usage = nestedMessage.message?.usage;
  if (!usage || typeof usage.input_tokens !== 'number') return null;

  return usage;
}

/**
 * Get context window usage percentage from JSONL transcript
 *
 * @param transcriptPath - Path to JSONL transcript file, or null
 * @returns Percentage (0-100), or null if unavailable
 */
export function getContextUsage(transcriptPath: string | null): number | null {
  // Return null if no path provided
  if (!transcriptPath) {
    return null;
  }

  try {
    // Check if file exists
    if (!fs.existsSync(transcriptPath)) {
      return null;
    }

    // Get file stats for cache check
    const stats = fs.statSync(transcriptPath);
    const mtime = stats.mtimeMs;

    // Check cache - return cached value if file unchanged
    const cached = cache.get(transcriptPath);
    if (cached && cached.mtime === mtime) {
      return cached.percentage;
    }

    // Read last portion of file (performance optimization)
    const fileSize = stats.size;
    let content: string;

    if (fileSize <= READ_TAIL_BYTES) {
      // Small file - read entirely
      content = fs.readFileSync(transcriptPath, 'utf-8');
    } else {
      // Large file - read from end
      const fd = fs.openSync(transcriptPath, 'r');
      const buffer = Buffer.alloc(READ_TAIL_BYTES);
      const startPosition = fileSize - READ_TAIL_BYTES;
      fs.readSync(fd, buffer, 0, READ_TAIL_BYTES, startPosition);
      fs.closeSync(fd);
      content = buffer.toString('utf-8');
    }

    // Split into lines and parse from end
    const lines = content.split('\n').filter(line => line.trim());

    // Find last valid assistant entry with usage (parse in reverse order)
    let usage: Usage | null = null;

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];

      try {
        const entry = JSON.parse(line);
        const extractedUsage = extractUsage(entry);

        if (extractedUsage) {
          usage = extractedUsage;
          break; // Found most recent valid entry
        }
      } catch {
        // Line may be partial (from reading file middle) - skip
        continue;
      }
    }

    // No valid entry found
    if (!usage) {
      return null;
    }

    // Calculate total tokens for context:
    // input_tokens + cache_creation_input_tokens + cache_read_input_tokens
    // Note: output_tokens don't count toward context window consumption
    const totalTokens =
      (usage.input_tokens || 0) +
      (usage.cache_creation_input_tokens || 0) +
      (usage.cache_read_input_tokens || 0);

    // Calculate percentage, cap at 100
    const percentage = Math.min(
      Math.round((totalTokens / CONTEXT_WINDOW_SIZE) * 100),
      100
    );

    // Update cache
    cache.set(transcriptPath, { mtime, percentage });

    return percentage;
  } catch {
    // Graceful degradation - return null on any error
    return null;
  }
}
