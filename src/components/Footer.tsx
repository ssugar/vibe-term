import React, { useState } from 'react';
import { Box, Text } from 'ink';
import figures from 'figures';
import { useAppStore } from '../stores/appStore.js';
import { useInterval } from '../hooks/useInterval.js';
import { formatRelativeTime } from '../utils/time.js';

export function Footer(): React.ReactElement {
  const lastRefresh = useAppStore((state) => state.lastRefresh);

  // Local ticker to force re-render every second for time display
  const [, setTick] = useState(0);
  useInterval(() => {
    setTick((t) => t + 1);
  }, 1000);

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
