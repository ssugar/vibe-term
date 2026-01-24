import React from 'react';
import { Box, Text } from 'ink';
import type { Session } from '../stores/types.js';
import { formatDurationSince } from '../utils/duration.js';
import { ContextMeter } from './ContextMeter.js';

/**
 * Status emoji mapping for visual feedback.
 * Uses Unicode characters that render correctly in terminal.
 */
const STATUS_EMOJI: Record<Session['status'], string> = {
  idle: '\u2705',      // Green checkmark ✅
  working: '\u23F3',   // Hourglass ⏳
  tool: '\u{1F527}',   // Wrench 🔧 - tool executing
  blocked: '\u{1F6D1}', // Stop sign 🛑
  ended: '\u274C',     // X mark ❌
};

interface SessionRowProps {
  session: Session;
  index: number; // 1-based display index
}

/**
 * Renders a single session row with status, project name, duration, model, and context meter.
 * Layout: [1] [status] project-name         45 min     sonnet +N ████░░░░░░░░  25% [T]
 *
 * Blocked sessions have red background with bold white text for emphasis.
 */
export function SessionRow({ session, index }: SessionRowProps): React.ReactElement {
  // Truncate project name if too long (max 24 chars, show 23 + ellipsis)
  const maxNameLength = 24;
  const displayName =
    session.projectName.length > maxNameLength
      ? session.projectName.slice(0, maxNameLength - 1) + '...'
      : session.projectName;

  // Pad project name to fixed width for alignment
  const paddedName = displayName.padEnd(maxNameLength, ' ');

  // Format duration from session start time
  const duration = formatDurationSince(session.startedAt);

  // Pad duration to fixed width (right-aligned appearance via left padding)
  const durationWidth = 12;
  const paddedDuration = duration.padStart(durationWidth, ' ');

  // Model display (defensive fallback to 'unknown' if falsy)
  const modelDisplay = session.model || 'unknown';

  // Subagent indicator (e.g., "+2" if 2 subagents running)
  const subagentDisplay = session.subagentCount > 0 ? `+${session.subagentCount}` : '';

  // Check if session is blocked for visual emphasis
  const isBlocked = session.status === 'blocked';

  // Status emoji for current state
  const statusEmoji = STATUS_EMOJI[session.status];

  if (isBlocked) {
    // Blocked row: red background, white bold text, entire row
    return (
      <Box flexDirection="row">
        <Text bold backgroundColor="red" color="white">
          [{index}] {statusEmoji} {paddedName} {paddedDuration} {modelDisplay}
        </Text>
        {/* Subagent indicator after colored section */}
        {subagentDisplay && (
          <>
            <Text> </Text>
            <Text color="yellow" bold>{subagentDisplay}</Text>
          </>
        )}
        {/* Context meter - always visible */}
        <Text> </Text>
        <ContextMeter percent={session.contextUsage ?? 0} width={12} />
        {/* tmux indicator after context meter */}
        {session.inTmux && (
          <>
            <Text> </Text>
            <Text dimColor color="cyan">[T]</Text>
          </>
        )}
      </Box>
    );
  }

  // Normal row: standard colors
  return (
    <Box flexDirection="row">
      {/* Index - bold cyan to suggest hotkey */}
      <Text color="cyan" bold>
        [{index}]
      </Text>
      <Text> </Text>

      {/* Status emoji */}
      <Text>{statusEmoji} </Text>

      {/* Project name - fixed width */}
      <Text>{paddedName}</Text>
      <Text> </Text>

      {/* Duration - dimmed, right-aligned */}
      <Text dimColor>{paddedDuration}</Text>
      <Text> </Text>

      {/* Model - dimmed */}
      <Text dimColor>{modelDisplay}</Text>
      <Text> </Text>

      {/* Subagent indicator - yellow if active */}
      {subagentDisplay ? (
        <Text color="yellow" bold>{subagentDisplay}</Text>
      ) : (
        <Text>  </Text>
      )}
      <Text> </Text>

      {/* Context meter */}
      <ContextMeter percent={session.contextUsage ?? 0} width={12} />
      <Text> </Text>

      {/* tmux indicator - show [T] if in tmux */}
      {session.inTmux ? (
        <Text dimColor color="cyan">
          [T]
        </Text>
      ) : (
        <Text>   </Text>
      )}
    </Box>
  );
}
