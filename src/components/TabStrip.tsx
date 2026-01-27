import React, { useState, useEffect, useMemo } from 'react';
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
 * Tab format: [~index:name emoji pct] (~ prefix for external)
 * - [ = 1 char
 * - ~ = 1 char (only for external sessions)
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
function calculateTabWidth(session: Session, index: number, maxNameWidth: number, isExternal = false): number {
  // Get display name (last directory from path)
  const projectName = session.projectPath.split('/').pop() || session.projectPath;

  // Truncated name length (if truncated, add 1 for ellipsis)
  const nameLen = Math.min(projectName.length, maxNameWidth);

  // Index width (1-9 = 1 char, 10+ = 2 chars, etc.)
  const indexWidth = String(index).length;

  // External prefix width (~ = 1 char)
  const externalPrefixWidth = isExternal ? 1 : 0;

  // Total: [ + ~? + index + : + name + space + emoji(2) + space + pct(4) + ] + separator(2)
  return 1 + externalPrefixWidth + indexWidth + 1 + nameLen + 1 + 2 + 1 + 4 + 1 + 2;
}

/**
 * TabStrip renders sessions as horizontal tabs with:
 * - Blocked sessions pinned to the left (always visible)
 * - Arrow indicators when tabs overflow
 * - Auto-scroll to keep selected tab visible
 */
export function TabStrip(): React.ReactElement {
  // ============================================================
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // ============================================================

  // Store subscriptions (selective to prevent unnecessary re-renders)
  const sessions = useAppStore((state) => state.sessions);
  const selectedIndex = useAppStore((state) => state.selectedIndex);
  const activeSessionId = useAppStore((state) => state.activeSessionId);

  // Terminal width for overflow calculation
  const terminalWidth = useTerminalWidth();

  // Scroll offset for normal (non-blocked) sessions
  const [scrollOffset, setScrollOffset] = useState(0);

  // Memoize session categorization to avoid recreating on every render
  // Three groups: blocked (pinned left), managed (scrollable middle), external (pinned right)
  const { blockedWithIndices, managedWithIndices, externalWithIndices } = useMemo(() => {
    const blocked: Array<{ session: Session; originalIndex: number }> = [];
    const managed: Array<{ session: Session; originalIndex: number }> = [];
    const external: Array<{ session: Session; originalIndex: number }> = [];

    sessions.forEach((session, idx) => {
      const item = { session, originalIndex: idx + 1 }; // 1-based index
      if (session.isExternal) {
        // External sessions always go to the right, even if blocked
        external.push(item);
      } else if (session.status === 'blocked') {
        blocked.push(item);
      } else {
        managed.push(item);
      }
    });

    return { blockedWithIndices: blocked, managedWithIndices: managed, externalWithIndices: external };
  }, [sessions]);

  // Calculate layout metrics (memoized)
  const layoutMetrics = useMemo(() => {
    if (sessions.length === 0) {
      return { blockedWidth: 0, externalWidth: 0, dividerWidth: 0, availableWidth: 0, visibleManagedCount: 0 };
    }

    // Calculate width used by blocked tabs
    const blockedWidth = blockedWithIndices.reduce(
      (total, { session, originalIndex }) => total + calculateTabWidth(session, originalIndex, MAX_NAME_WIDTH),
      0
    );

    // Calculate width used by external tabs (pinned right)
    const externalWidth = externalWithIndices.reduce(
      (total, { session, originalIndex }) => total + calculateTabWidth(session, originalIndex, MAX_NAME_WIDTH, true),
      0
    );

    // Divider width (3 chars: " | ") - only if external sessions exist
    const dividerWidth = externalWithIndices.length > 0 ? 3 : 0;

    // Arrow indicators width (3 chars each: symbol + space)
    const leftArrowWidth = 3;
    const rightArrowWidth = 3;

    // Calculate available width for managed tabs
    const availableWidth = terminalWidth - blockedWidth - externalWidth - dividerWidth - leftArrowWidth - rightArrowWidth;

    // Calculate how many managed tabs fit
    let visibleManagedCount = 0;
    let accumulatedWidth = 0;

    for (let i = scrollOffset; i < managedWithIndices.length; i++) {
      const { session, originalIndex } = managedWithIndices[i];
      const tabWidth = calculateTabWidth(session, originalIndex, MAX_NAME_WIDTH);
      if (accumulatedWidth + tabWidth <= availableWidth) {
        accumulatedWidth += tabWidth;
        visibleManagedCount++;
      } else {
        break;
      }
    }

    // Ensure at least 1 tab is visible if there are any
    if (visibleManagedCount === 0 && managedWithIndices.length > 0) {
      visibleManagedCount = 1;
    }

    return { blockedWidth, externalWidth, dividerWidth, availableWidth, visibleManagedCount };
  }, [sessions.length, blockedWithIndices, managedWithIndices, externalWithIndices, terminalWidth, scrollOffset]);

  const { visibleManagedCount } = layoutMetrics;

  // Auto-adjust scroll to keep selected tab visible (only for managed sessions)
  useEffect(() => {
    // Skip if no sessions
    if (sessions.length === 0) return;

    // Find if selected is in blocked, managed, or external
    const selectedSession = sessions[selectedIndex];
    if (!selectedSession) return;

    // External sessions are always visible (pinned right), no scroll adjustment needed
    // Blocked internal sessions are also always visible (pinned left)
    if (selectedSession.isExternal || selectedSession.status === 'blocked') {
      return;
    }

    // Find position in managed sessions
    const managedPosition = managedWithIndices.findIndex(
      ({ session }) => session.id === selectedSession.id
    );

    if (managedPosition === -1) return;

    // Calculate visible count (use at least 1)
    const currentVisibleCount = Math.max(1, visibleManagedCount);

    // If selected is before visible range, scroll left
    if (managedPosition < scrollOffset) {
      setScrollOffset(managedPosition);
      return;
    }

    // If selected is after visible range, scroll right
    if (managedPosition >= scrollOffset + currentVisibleCount) {
      setScrollOffset(Math.max(0, managedPosition - currentVisibleCount + 1));
    }
  }, [selectedIndex, sessions, managedWithIndices, scrollOffset, visibleManagedCount]);

  // ============================================================
  // CONDITIONAL RETURNS START HERE (after all hooks)
  // ============================================================

  // Empty state
  if (sessions.length === 0) {
    return <EmptyState />;
  }

  // Narrow terminal warning
  if (terminalWidth < 60) {
    return (
      <Box>
        <Text color="yellow">Terminal too narrow ({terminalWidth} cols). Need 60+</Text>
      </Box>
    );
  }

  // Visible managed sessions (scrollable middle section)
  const visibleManagedSessions = managedWithIndices.slice(scrollOffset, scrollOffset + visibleManagedCount);

  // Arrow indicators (only for managed sessions scrolling)
  const showLeftArrow = scrollOffset > 0;
  const showRightArrow = scrollOffset + visibleManagedCount < managedWithIndices.length;

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
            isActive={session.id === activeSessionId}
            maxNameWidth={MAX_NAME_WIDTH}
          />
        </Box>
      ))}

      {/* Managed sessions (scrollable middle) */}
      {visibleManagedSessions.map(({ session, originalIndex }) => (
        <Box key={session.id} marginRight={2}>
          <Tab
            session={session}
            index={originalIndex}
            isSelected={selectedIndex === originalIndex - 1}
            isActive={session.id === activeSessionId}
            maxNameWidth={MAX_NAME_WIDTH}
          />
        </Box>
      ))}

      {/* Right arrow indicator */}
      {showRightArrow && <Text dimColor>  {figures.arrowRight}</Text>}

      {/* Divider between managed and external sessions */}
      {externalWithIndices.length > 0 && (
        <Text dimColor> | </Text>
      )}

      {/* External sessions (always visible, pinned right) */}
      {externalWithIndices.map(({ session, originalIndex }) => (
        <Box key={session.id} marginRight={2}>
          <Tab
            session={session}
            index={originalIndex}
            isSelected={selectedIndex === originalIndex - 1}
            isActive={session.id === activeSessionId}
            isExternal={true}
            maxNameWidth={MAX_NAME_WIDTH}
          />
        </Box>
      ))}
    </Box>
  );
}
