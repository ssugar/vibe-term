import React from 'react';
import { Box, Text } from 'ink';

/**
 * EmptyState renders a compact single-line message when no sessions are detected.
 * Designed to fit within the 3-line HUD pane (which includes border when focused).
 */
export function EmptyState(): React.ReactElement {
  return (
    <Box>
      <Text dimColor>No sessions </Text>
      <Text dimColor>{'·'} </Text>
      <Text dimColor>Press </Text>
      <Text color="cyan">n</Text>
      <Text dimColor> to spawn new Claude session</Text>
    </Box>
  );
}
