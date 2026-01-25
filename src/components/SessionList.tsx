import React from 'react';
import { Box } from 'ink';
import { useAppStore } from '../stores/appStore.js';
import { EmptyState } from './EmptyState.js';
import { SessionRow } from './SessionRow.js';

export function SessionList(): React.ReactElement {
  const sessions = useAppStore((state) => state.sessions);
  const selectedIndex = useAppStore((state) => state.selectedIndex);

  if (sessions.length === 0) {
    return <EmptyState />;
  }

  return (
    <Box flexDirection="column">
      {sessions.map((session, idx) => (
        <SessionRow
          key={session.id}
          session={session}
          index={idx + 1}
          isSelected={idx === selectedIndex}
        />
      ))}
    </Box>
  );
}
