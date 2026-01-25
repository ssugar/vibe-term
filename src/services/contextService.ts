import * as fs from 'fs';
import { execSync } from 'child_process';

// All Claude 4.x models use 200K standard context window
const CONTEXT_WINDOW_SIZE = 200_000;

// Cache to avoid re-parsing unchanged files
interface CacheEntry {
  mtime: number;
  percentage: number;
}
const cache = new Map<string, CacheEntry>();

// Last known good percentage - survives parse failures during active file writing
const lastKnownGood = new Map<string, number>();

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
 * Assistant messages have:
 * - Top level: type: "assistant", isSidechain: boolean
 * - Usage at: message.usage
 */
interface JsonlEntry {
  type: string;  // "assistant", "user", "progress", etc
  isSidechain?: boolean;
  message?: {
    usage?: Usage;
  };
}

/**
 * Extract usage data from a JSONL entry if it's a valid assistant entry
 */
function extractUsage(entry: unknown): Usage | null {
  if (typeof entry !== 'object' || entry === null) return null;

  const e = entry as JsonlEntry;

  // Must be assistant type at top level
  if (e.type !== 'assistant') return null;

  // Must not be sidechain (subagent context is separate)
  if (e.isSidechain === true) return null;

  // Get usage from message.usage
  const usage = e.message?.usage;
  if (!usage || typeof usage.input_tokens !== 'number') return null;

  return usage;
}

/**
 * Get context window usage percentage from JSONL transcript
 *
 * Uses grep to efficiently find the last main agent assistant entry,
 * filtering out sidechain (subagent) entries.
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

    // Use grep to find the last main agent assistant entry
    // 1. Find all lines with "type":"assistant"
    // 2. Filter out sidechain entries (subagents)
    // 3. Get the last match
    let lastMainEntry: string;
    try {
      lastMainEntry = execSync(
        `grep -a '"type":"assistant"' "${transcriptPath}" | grep -v '"isSidechain":true' | tail -1`,
        { encoding: 'utf-8', maxBuffer: 1024 * 1024 }
      ).trim();
    } catch {
      // grep failed - return last known good value if available
      return lastKnownGood.get(transcriptPath) ?? null;
    }

    if (!lastMainEntry) {
      // No entries found - return last known good value if available
      return lastKnownGood.get(transcriptPath) ?? null;
    }

    // Parse the JSON entry
    let entry: unknown;
    try {
      entry = JSON.parse(lastMainEntry);
    } catch {
      // Parse failed (possibly due to concurrent write) - return last known good
      return lastKnownGood.get(transcriptPath) ?? null;
    }

    // Extract usage
    const usage = extractUsage(entry);
    if (!usage) {
      // Extraction failed - return last known good
      return lastKnownGood.get(transcriptPath) ?? null;
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

    // Update caches
    cache.set(transcriptPath, { mtime, percentage });
    lastKnownGood.set(transcriptPath, percentage);

    return percentage;
  } catch {
    // Graceful degradation - return last known good or null
    return lastKnownGood.get(transcriptPath) ?? null;
  }
}
