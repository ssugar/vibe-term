import React from 'react';
import { Box, Text } from 'ink';
import { useAppStore } from '../stores/appStore.js';

export function Header(): React.ReactElement {
  const sessions = useAppStore((state) => state.sessions);

  // Count sessions by status
  const blocked = sessions.filter((s) => s.status === 'blocked').length;
  const working = sessions.filter((s) => s.status === 'working').length;
  const tool = sessions.filter((s) => s.status === 'tool').length;
  const idle = sessions.filter((s) => s.status === 'idle').length;

  // Combined active count (working + tool) for display
  const active = working + tool;

  const hasAny = sessions.length > 0;

  return (
    <Box borderStyle="round" borderColor="blue" paddingX={1}>
      <Text bold color="cyan">vibe-term</Text>
      <Text> - </Text>
      {hasAny ? (
        <>
          {blocked > 0 && <Text color="red" bold>{blocked} blocked</Text>}
          {blocked > 0 && active > 0 && <Text>, </Text>}
          {active > 0 && (
            <>
              <Text color="yellow">{active} working</Text>
              {tool > 0 && <Text color="yellow" dimColor> ({tool} tool)</Text>}
            </>
          )}
          {(blocked > 0 || active > 0) && idle > 0 && <Text>, </Text>}
          {idle > 0 && <Text color="green">{idle} idle</Text>}
        </>
      ) : (
        <Text color="gray">No sessions</Text>
      )}
    </Box>
  );
}
