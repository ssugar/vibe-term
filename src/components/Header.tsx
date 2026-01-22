import React from 'react';
import { Box, Text } from 'ink';
import { useAppStore } from '../stores/appStore.js';

export function Header(): React.ReactElement {
  const sessions = useAppStore((state) => state.sessions);

  // Count sessions by status (for later phases)
  const blocked = sessions.filter((s) => s.status === 'blocked').length;
  const working = sessions.filter((s) => s.status === 'working').length;
  const idle = sessions.filter((s) => s.status === 'idle').length;

  const hasAny = sessions.length > 0;

  return (
    <Box borderStyle="round" borderColor="blue" paddingX={1}>
      <Text bold color="cyan">Claude Code HUD</Text>
      <Text> - </Text>
      {hasAny ? (
        <>
          {blocked > 0 && <Text color="red" bold>{blocked} blocked</Text>}
          {blocked > 0 && working > 0 && <Text>, </Text>}
          {working > 0 && <Text color="yellow">{working} working</Text>}
          {(blocked > 0 || working > 0) && idle > 0 && <Text>, </Text>}
          {idle > 0 && <Text color="green">{idle} idle</Text>}
        </>
      ) : (
        <Text color="gray">No sessions</Text>
      )}
    </Box>
  );
}
