import React from 'react';
import { Box, Text } from 'ink';

export function EmptyState(): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      paddingY={2}
    >
      <Text>
        {`  ╭──────────────────╮
  │  No Claude Code  │
  │    sessions      │
  ╰──────────────────╯`}
      </Text>
      <Box marginTop={1}>
        <Text dimColor>Start a Claude session to see it here</Text>
      </Box>
    </Box>
  );
}
