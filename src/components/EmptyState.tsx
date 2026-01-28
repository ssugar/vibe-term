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
  │   No sessions    │
  │    detected      │
  ╰──────────────────╯`}
      </Text>
      <Box marginTop={1}>
        <Text dimColor>Start an AI coding session to see it here</Text>
      </Box>
    </Box>
  );
}
