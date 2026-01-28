import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import figures from 'figures';
import { Tab, type DisplayMode } from './Tab.js';
import { useTerminalWidth } from '../hooks/useTerminalWidth.js';
import { useAppStore } from '../stores/appStore.js';
import { EmptyState } from './EmptyState.js';
import type { Session } from '../stores/types.js';

const MAX_NAME_WIDTH = 20;
const MEDIUM_NAME_WIDTH = 8;

// Responsive breakpoints (terminal width thresholds)
const BREAKPOINTS = {
  WIDE: 80,    // Full format: [1:project-name ✅ 45%]
  MEDIUM: 50,  // Compact: [1:proj ✅ 45%]
  NARROW: 40,  // No name: [1 ✅ 45%]
  // Below 40: minimal format 1✅45
};

// Minimum terminal width we support
const MIN_TERMINAL_WIDTH = 35;

/**
 * Determine display mode based on terminal width.
 */
function getDisplayMode(terminalWidth: number): DisplayMode {
  if (terminalWidth >= BREAKPOINTS.WIDE) return 'wide';
  if (terminalWidth >= BREAKPOINTS.MEDIUM) return 'medium';
  if (terminalWidth >= BREAKPOINTS.NARROW) return 'narrow';
  return 'minimal';
}

/**
 * Calculate the rendered width of a tab including separator.
 *
 * Width varies by display mode:
 * - wide: [1:project-name ✅ 45%] + separator
 * - medium: [1:proj ✅ 45%] + separator
 * - narrow: [1 ✅ 45%] + separator
 * - minimal: 1✅45 + separator
 */
function calculateTabWidth(session: Session, index: number, displayMode: DisplayMode, isExternal = false): number {
  // Index display width: external shows "~E" (2 chars), internal shows number (1-2 chars)
  const indexDisplayWidth = isExternal ? 2 : String(index).length;

  // Separator varies by display mode (margin-right in render)
  const separator = displayMode === 'minimal' ? 1 : 2;

  // Context percentage width varies: minimal has no %, others have padded "XX%"
  const contextWidth = displayMode === 'minimal'
    ? String(Math.round(session.contextUsage)).length // Just the number
    : 4; // Padded " 0%" to "100%"

  // Emoji is typically 2 chars wide in terminal
  const emojiWidth = 2;

  switch (displayMode) {
    case 'minimal':
      // Format: 1✅45 (no brackets, no spaces, no %)
      return indexDisplayWidth + emojiWidth + contextWidth + separator;

    case 'narrow':
      // Format: [1 ✅ 45%] (no name)
      // [ + index + space + emoji + space + pct + ]
      return 1 + indexDisplayWidth + 1 + emojiWidth + 1 + contextWidth + 1 + separator;

    case 'medium': {
      // Format: [1:proj ✅ 45%] (8 char name max)
      const projectName = session.projectPath.split('/').pop() || session.projectPath;
      const nameLen = Math.min(projectName.length, MEDIUM_NAME_WIDTH);
      // [ + index + : + name + space + emoji + space + pct + ]
      return 1 + indexDisplayWidth + 1 + nameLen + 1 + emojiWidth + 1 + contextWidth + 1 + separator;
    }

    case 'wide':
    default: {
      // Format: [1:project-name ✅ 45%]
      const projectName = session.projectPath.split('/').pop() || session.projectPath;
      const nameLen = Math.min(projectName.length, MAX_NAME_WIDTH);
      // [ + index + : + name + space + emoji + space + pct + ]
      return 1 + indexDisplayWidth + 1 + nameLen + 1 + emojiWidth + 1 + contextWidth + 1 + separator;
    }
  }
}

/**
 * TabStrip renders sessions as horizontal tabs with:
 * - Internal sessions in stable order (1, 2, 3...) regardless of status
 * - External sessions pinned to the right
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

  // Scroll offset for managed (internal) sessions
  const [scrollOffset, setScrollOffset] = useState(0);

  // Determine display mode based on terminal width
  const displayMode = useMemo(() => getDisplayMode(terminalWidth), [terminalWidth]);

  // Memoize session categorization to avoid recreating on every render
  // Two groups: managed (scrollable, maintains order), external (pinned right)
  // Blocked sessions stay in their original position - no reordering
  const { managedWithIndices, externalWithIndices } = useMemo(() => {
    const managed: Array<{ session: Session; originalIndex: number }> = [];
    const external: Array<{ session: Session; originalIndex: number }> = [];

    sessions.forEach((session, idx) => {
      const item = { session, originalIndex: idx + 1 }; // 1-based index
      if (session.isExternal) {
        // External sessions always go to the right
        external.push(item);
      } else {
        // All internal sessions (including blocked) stay in order
        managed.push(item);
      }
    });

    return { managedWithIndices: managed, externalWithIndices: external };
  }, [sessions]);

  // Calculate layout metrics (memoized)
  const layoutMetrics = useMemo(() => {
    if (sessions.length === 0) {
      return { externalWidth: 0, dividerWidth: 0, availableWidth: 0, visibleManagedCount: 0 };
    }

    // Calculate width used by external tabs (pinned right)
    const externalWidth = externalWithIndices.reduce(
      (total, { session, originalIndex }) => total + calculateTabWidth(session, originalIndex, displayMode, true),
      0
    );

    // Divider width (3 chars: " | ") - only if external sessions exist
    // At minimal mode, use shorter divider (1 char)
    const dividerWidth = externalWithIndices.length > 0
      ? (displayMode === 'minimal' ? 1 : 3)
      : 0;

    // Arrow indicators width - smaller at narrow widths
    const arrowWidth = displayMode === 'minimal' ? 1 : 3;
    const leftArrowWidth = arrowWidth;
    const rightArrowWidth = arrowWidth;

    // Calculate available width for managed tabs
    const availableWidth = terminalWidth - externalWidth - dividerWidth - leftArrowWidth - rightArrowWidth;

    // Calculate how many managed tabs fit
    let visibleManagedCount = 0;
    let accumulatedWidth = 0;

    for (let i = scrollOffset; i < managedWithIndices.length; i++) {
      const { session, originalIndex } = managedWithIndices[i];
      const tabWidth = calculateTabWidth(session, originalIndex, displayMode);
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

    return { externalWidth, dividerWidth, availableWidth, visibleManagedCount };
  }, [sessions.length, managedWithIndices, externalWithIndices, terminalWidth, scrollOffset, displayMode]);

  const { visibleManagedCount } = layoutMetrics;

  // Auto-adjust scroll to keep selected tab visible (only for managed sessions)
  useEffect(() => {
    // Skip if no sessions
    if (sessions.length === 0) return;

    // Find if selected is managed or external
    const selectedSession = sessions[selectedIndex];
    if (!selectedSession) return;

    // External sessions are always visible (pinned right), no scroll adjustment needed
    if (selectedSession.isExternal) {
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

  // Narrow terminal warning (only below our minimum)
  if (terminalWidth < MIN_TERMINAL_WIDTH) {
    return (
      <Box>
        <Text color="yellow">Too narrow ({terminalWidth}). Need {MIN_TERMINAL_WIDTH}+</Text>
      </Box>
    );
  }

  // Visible managed sessions (scrollable middle section)
  const visibleManagedSessions = managedWithIndices.slice(scrollOffset, scrollOffset + visibleManagedCount);

  // Arrow indicators (only for managed sessions scrolling)
  const showLeftArrow = scrollOffset > 0;
  const showRightArrow = scrollOffset + visibleManagedCount < managedWithIndices.length;

  // Arrow spacing varies by display mode
  const arrowSpacing = displayMode === 'minimal' ? '' : '  ';
  const arrowPlaceholder = displayMode === 'minimal' ? ' ' : '   ';

  return (
    <Box flexDirection="row">
      {/* Left arrow indicator */}
      {showLeftArrow && <Text dimColor>{figures.arrowLeft}{arrowSpacing}</Text>}
      {!showLeftArrow && <Text>{arrowPlaceholder}</Text>}

      {/* Managed sessions (scrollable, includes all internal sessions in order) */}
      {visibleManagedSessions.map(({ session, originalIndex }) => (
        <Box key={session.id} marginRight={displayMode === 'minimal' ? 1 : 2}>
          <Tab
            session={session}
            index={originalIndex}
            isSelected={selectedIndex === originalIndex - 1}
            isActive={session.id === activeSessionId}
            maxNameWidth={MAX_NAME_WIDTH}
            displayMode={displayMode}
          />
        </Box>
      ))}

      {/* Right arrow indicator */}
      {showRightArrow && <Text dimColor>{arrowSpacing}{figures.arrowRight}</Text>}

      {/* Divider between managed and external sessions */}
      {externalWithIndices.length > 0 && (
        <Text dimColor>{displayMode === 'minimal' ? '|' : ' | '}</Text>
      )}

      {/* External sessions (always visible, pinned right) */}
      {externalWithIndices.map(({ session, originalIndex }) => (
        <Box key={session.id} marginRight={displayMode === 'minimal' ? 1 : 2}>
          <Tab
            session={session}
            index={originalIndex}
            isSelected={selectedIndex === originalIndex - 1}
            isActive={session.id === activeSessionId}
            isExternal={true}
            maxNameWidth={MAX_NAME_WIDTH}
            displayMode={displayMode}
          />
        </Box>
      ))}
    </Box>
  );
}
