import React from 'react';
import { Box, Text } from 'ink';
import type { Session } from '../stores/types.js';
import { formatDurationSince } from '../utils/duration.js';

interface SessionRowProps {
  session: Session;
  index: number; // 1-based display index
}

/**
 * Renders a single session row with index, project name, duration, and tmux indicator.
 * Layout: [1] cc-tui-hud            45 min     [T]
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

  return (
    <Box flexDirection="row">
      {/* Index - bold cyan to suggest hotkey */}
      <Text color="cyan" bold>
        [{index}]
      </Text>
      <Text> </Text>

      {/* Project name - fixed width */}
      <Text>{paddedName}</Text>
      <Text> </Text>

      {/* Duration - dimmed, right-aligned */}
      <Text dimColor>{paddedDuration}</Text>
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
