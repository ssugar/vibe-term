import React from 'react';
import { Box, Text } from 'ink';
import figures from 'figures';
import { useAppStore } from '../stores/appStore.js';
import { formatRelativeTime } from '../utils/time.js';

export function Footer(): React.ReactElement {
  const lastRefresh = useAppStore((state) => state.lastRefresh);
  const timeAgo = formatRelativeTime(lastRefresh);

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      justifyContent="space-between"
    >
      <Text>
        <Text dimColor>j/k:</Text>
        <Text> navigate </Text>
        <Text>{figures.bullet} </Text>
        <Text dimColor>enter:</Text>
        <Text> select </Text>
        <Text>{figures.bullet} </Text>
        <Text dimColor>q:</Text>
        <Text> quit </Text>
        <Text>{figures.bullet} </Text>
        <Text dimColor>?:</Text>
        <Text> help</Text>
      </Text>
      <Text dimColor>Updated {timeAgo}</Text>
    </Box>
  );
}
