import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import figures from 'figures';
import { Tab } from './Tab.js';
import { useTerminalWidth } from '../hooks/useTerminalWidth.js';
import { useAppStore } from '../stores/appStore.js';
import { EmptyState } from './EmptyState.js';
import type { Session } from '../stores/types.js';

const MAX_NAME_WIDTH = 20;

/**
 * Calculate the rendered width of a tab including separator.
 *
 * Tab format: [index:name emoji pct]
 * - [ = 1 char
 * - index = varies (1-9 = 1 char, 10+ = 2 chars)
 * - : = 1 char
 * - name = truncated to maxNameWidth
 * - space = 1 char
 * - emoji = 2 chars (most Unicode emojis are double-width in terminal)
 * - space = 1 char
 * - pct = 4 chars (padded "0%" to "100%")
 * - ] = 1 char
 * - separator = 2 chars (double space after tab)
 */
function calculateTabWidth(session: Session, index: number, maxNameWidth: number): number {
  // Get display name (last directory from path)
  const projectName = session.projectPath.split('/').pop() || session.projectPath;

  // Truncated name length (if truncated, add 1 for ellipsis)
  const nameLen = Math.min(projectName.length, maxNameWidth);

  // Index width (1-9 = 1 char, 10+ = 2 chars, etc.)
  const indexWidth = String(index).length;

  // Total: [ + index + : + name + space + emoji(2) + space + pct(4) + ] + separator(2)
  return 1 + indexWidth + 1 + nameLen + 1 + 2 + 1 + 4 + 1 + 2;
}

/**
 * TabStrip renders sessions as horizontal tabs with:
 * - Blocked sessions pinned to the left (always visible)
 * - Arrow indicators when tabs overflow
 * - Auto-scroll to keep selected tab visible
 */
export function TabStrip(): React.ReactElement {
  // Store subscriptions (selective to prevent unnecessary re-renders)
  const sessions = useAppStore((state) => state.sessions);
  const selectedIndex = useAppStore((state) => state.selectedIndex);

  // Terminal width for overflow calculation
  const terminalWidth = useTerminalWidth();

  // Scroll offset for normal (non-blocked) sessions
  const [scrollOffset, setScrollOffset] = useState(0);

  // Empty state
  if (sessions.length === 0) {
    return <EmptyState />;
  }

  // Separate blocked and normal sessions while preserving original indices
  const blockedWithIndices: Array<{ session: Session; originalIndex: number }> = [];
  const normalWithIndices: Array<{ session: Session; originalIndex: number }> = [];

  sessions.forEach((session, idx) => {
    const item = { session, originalIndex: idx + 1 }; // 1-based index
    if (session.status === 'blocked') {
      blockedWithIndices.push(item);
    } else {
      normalWithIndices.push(item);
    }
  });

  // Calculate width used by blocked tabs
  const blockedWidth = blockedWithIndices.reduce(
    (total, { session, originalIndex }) => total + calculateTabWidth(session, originalIndex, MAX_NAME_WIDTH),
    0
  );

  // Arrow indicators width (3 chars each: symbol + space)
  const leftArrowWidth = 3;
  const rightArrowWidth = 3;

  // Calculate available width for normal tabs
  // Reserve space for potential arrows (they'll only show if needed)
  const availableWidth = terminalWidth - blockedWidth - leftArrowWidth - rightArrowWidth;

  // Calculate how many normal tabs fit and which are visible
  let visibleNormalCount = 0;
  let accumulatedWidth = 0;

  for (let i = scrollOffset; i < normalWithIndices.length; i++) {
    const { session, originalIndex } = normalWithIndices[i];
    const tabWidth = calculateTabWidth(session, originalIndex, MAX_NAME_WIDTH);
    if (accumulatedWidth + tabWidth <= availableWidth) {
      accumulatedWidth += tabWidth;
      visibleNormalCount++;
    } else {
      break;
    }
  }

  // Ensure at least 1 tab is visible if there are any
  if (visibleNormalCount === 0 && normalWithIndices.length > 0) {
    visibleNormalCount = 1;
  }

  // Visible normal sessions
  const visibleNormalSessions = normalWithIndices.slice(scrollOffset, scrollOffset + visibleNormalCount);

  // Arrow indicators
  const showLeftArrow = scrollOffset > 0;
  const showRightArrow = scrollOffset + visibleNormalCount < normalWithIndices.length;

  // Auto-adjust scroll to keep selected tab visible
  useEffect(() => {
    // Find if selected is in blocked or normal
    const selectedSession = sessions[selectedIndex];
    if (!selectedSession) return;

    // Blocked sessions are always visible, no scroll adjustment needed
    if (selectedSession.status === 'blocked') {
      return;
    }

    // Find position in normal sessions
    const normalPosition = normalWithIndices.findIndex(
      ({ session }) => session.id === selectedSession.id
    );

    if (normalPosition === -1) return;

    // If selected is before visible range, scroll left
    if (normalPosition < scrollOffset) {
      setScrollOffset(normalPosition);
      return;
    }

    // If selected is after visible range, scroll right
    if (normalPosition >= scrollOffset + visibleNormalCount) {
      setScrollOffset(normalPosition - visibleNormalCount + 1);
    }
  }, [selectedIndex, sessions, normalWithIndices, scrollOffset, visibleNormalCount]);

  // Narrow terminal warning
  if (terminalWidth < 60) {
    return (
      <Box>
        <Text color="yellow">Terminal too narrow ({terminalWidth} cols). Need 60+</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="row">
      {/* Left arrow indicator */}
      {showLeftArrow && <Text dimColor>{figures.arrowLeft}  </Text>}
      {!showLeftArrow && <Text>   </Text>}

      {/* Blocked sessions (always visible, pinned left) */}
      {blockedWithIndices.map(({ session, originalIndex }) => (
        <Box key={session.id} marginRight={2}>
          <Tab
            session={session}
            index={originalIndex}
            isSelected={selectedIndex === originalIndex - 1}
            maxNameWidth={MAX_NAME_WIDTH}
          />
        </Box>
      ))}

      {/* Normal sessions (scrollable) */}
      {visibleNormalSessions.map(({ session, originalIndex }) => (
        <Box key={session.id} marginRight={2}>
          <Tab
            session={session}
            index={originalIndex}
            isSelected={selectedIndex === originalIndex - 1}
            maxNameWidth={MAX_NAME_WIDTH}
          />
        </Box>
      ))}

      {/* Right arrow indicator */}
      {showRightArrow && <Text dimColor>  {figures.arrowRight}</Text>}
    </Box>
  );
}
