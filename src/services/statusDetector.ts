import { findLatestLogFile, readLastEntry } from './logPathService.js';
import type { LogEntry } from './logPathService.js';

/**
 * Canonical model types used in the HUD.
 */
export type ModelType = 'sonnet' | 'opus' | 'haiku';

/**
 * Session status values for display.
 */
export type SessionStatus = 'working' | 'idle' | 'blocked';

/**
 * Result of status detection for a session.
 */
export interface StatusResult {
  status: SessionStatus;
  model: ModelType | null;
}

/**
 * Threshold in milliseconds before declaring a tool_use as blocked.
 * Tool execution may take time; we wait 5 seconds before showing blocked.
 */
const TOOL_APPROVAL_THRESHOLD_MS = 5000;

/**
 * Extract canonical model type from full model string.
 * Returns null for unknown models to allow UI to show "unknown".
 *
 * @param modelString - Full model name from log (e.g., "claude-opus-4-20250514")
 * @returns Canonical model type or null if unknown
 */
export function extractModel(modelString?: string): ModelType | null {
  if (!modelString || modelString.trim() === '') {
    return null;
  }

  const lower = modelString.toLowerCase();

  // Check in order: opus is premium, haiku is fast, sonnet is default
  if (lower.includes('opus')) return 'opus';
  if (lower.includes('haiku')) return 'haiku';
  if (lower.includes('sonnet')) return 'sonnet';

  // Unknown model - return null
  return null;
}

/**
 * Detect session status from a log entry using state machine logic.
 *
 * State machine:
 * - User entry -> Working (Claude processing user input)
 * - Summary entry -> Idle (metadata entry)
 * - Assistant entry:
 *   - stop_reason: tool_use + elapsed > threshold -> Blocked
 *   - stop_reason: tool_use + elapsed <= threshold -> Working (tool may be running)
 *   - stop_reason: end_turn -> Idle
 *   - stop_reason: null/undefined -> Working (still generating)
 *
 * @param entry - Parsed log entry
 * @param entryTime - Timestamp when the entry was created
 * @returns Session status
 */
export function detectStatus(entry: LogEntry, entryTime: Date): SessionStatus {
  const elapsed = Date.now() - entryTime.getTime();

  // User entries mean Claude is about to respond or processing tool result
  if (entry.type === 'user') {
    return 'working';
  }

  // Summary entries are metadata, session is idle
  if (entry.type === 'summary') {
    return 'idle';
  }

  // Assistant entries - examine stop_reason
  const stopReason = entry.message?.stop_reason;

  // Claude wants to use a tool and is waiting for approval
  if (stopReason === 'tool_use') {
    // If more than threshold elapsed, definitely blocked (waiting for approval)
    if (elapsed > TOOL_APPROVAL_THRESHOLD_MS) {
      return 'blocked';
    }
    // Recently requested tool - might still be running
    return 'working';
  }

  // Claude finished its turn naturally
  if (stopReason === 'end_turn') {
    return 'idle';
  }

  // No stop_reason yet means still generating
  // This includes null, undefined, and max_tokens in progress
  if (stopReason === null || stopReason === undefined) {
    return 'working';
  }

  // Default to idle for unexpected cases (e.g., max_tokens completed)
  return 'idle';
}

/**
 * Get status and model for a session by reading its JSONL log.
 * Returns safe defaults when logs are unavailable (graceful degradation).
 *
 * @param projectPath - Full path to the project
 * @returns Status and model (model may be null if unknown)
 */
export function getSessionStatus(projectPath: string): StatusResult {
  const defaults: StatusResult = { status: 'idle', model: null };

  // Find the most recent log file for this project
  const logFile = findLatestLogFile(projectPath);
  if (!logFile) {
    return defaults;
  }

  // Read and parse the last entry
  const entry = readLastEntry(logFile);
  if (!entry) {
    return defaults;
  }

  // Parse timestamp from entry
  const entryTime = new Date(entry.timestamp);

  // Detect status using state machine logic
  const status = detectStatus(entry, entryTime);

  // Extract model from message (may be null for unknown models)
  const model = extractModel(entry.message?.model);

  return { status, model };
}
