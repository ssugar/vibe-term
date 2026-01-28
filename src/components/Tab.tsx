import React from 'react';
import { Text } from 'ink';
import type { Session } from '../stores/types.js';

/**
 * Status emoji mapping for visual feedback.
 * Uses Unicode characters that render correctly in terminal.
 */
const STATUS_EMOJI: Record<Session['status'], string> = {
  idle: '\u2705',      // Green checkmark
  working: '\u23F3',   // Hourglass
  tool: '\u{1F527}',   // Wrench - tool executing
  blocked: '\u{1F6D1}', // Stop sign
  ended: '\u274C',     // X mark
};

/**
 * Display mode determines tab format based on available terminal width.
 * - wide: Full format [1:project-name ✅ 45%]
 * - medium: Compact [1:proj ✅ 45%] (8 char name max)
 * - narrow: No name [1 ✅ 45%]
 * - minimal: Compressed 1✅45 (no brackets, no %)
 */
export type DisplayMode = 'wide' | 'medium' | 'narrow' | 'minimal';

interface TabProps {
  session: Session;
  index: number;           // 1-based display index
  isSelected: boolean;
  isActive: boolean;       // Session is currently displayed in main pane
  isExternal?: boolean;    // Session is in external tmux session
  maxNameWidth?: number;   // Default 20 (for wide mode)
  displayMode?: DisplayMode; // Responsive display mode
}

/**
 * Get context percentage color based on usage level.
 */
function getContextColor(usage: number): 'green' | 'yellow' | 'red' {
  if (usage < 30) return 'green';
  if (usage <= 70) return 'yellow';
  return 'red';
}

/**
 * Renders a single session as a compact horizontal tab.
 * Format: [index:name status context%]
 *
 * Visual states (priority order):
 * - Active + Selected: underline (in main pane, cursor here)
 * - Active only: underline (in main pane, cursor elsewhere)
 * - Selected only: underline (cursor here, not in main pane)
 * - Normal: default colors
 * - Blocked status is indicated by the stop sign emoji only, no background change
 */
export function Tab({ session, index, isSelected, isActive, isExternal = false, maxNameWidth = 20, displayMode = 'wide' }: TabProps): React.ReactElement {
  // Extract project name from projectPath (last directory)
  const rawName = session.projectPath.split('/').pop() || 'unknown';

  // Status emoji
  const statusEmoji = STATUS_EMOJI[session.status];

  // Context percentage - format varies by display mode
  const contextValue = Math.round(session.contextUsage);
  const contextPct = displayMode === 'minimal'
    ? String(contextValue) // Just the number, no %
    : `${contextValue}%`.padStart(4); // Padded with %
  const contextColor = getContextColor(session.contextUsage);

  // External sessions show ~E: instead of number (can't quick-jump to them)
  // Internal sessions show their number for quick-jump with 1-9 or Alt+N
  const indexDisplay = isExternal ? '~E' : String(index);

  // Build tab content based on display mode
  let tabContent: string;
  let closingBracket: string;

  switch (displayMode) {
    case 'minimal':
      // Compressed: 1✅45 (no brackets, no %, no spaces)
      tabContent = `${indexDisplay}${statusEmoji}`;
      closingBracket = '';
      break;
    case 'narrow':
      // No name: [1 ✅ 45%]
      tabContent = `[${indexDisplay} ${statusEmoji} `;
      closingBracket = ']';
      break;
    case 'medium': {
      // Compact: [1:proj ✅ 45%] (8 char name max)
      const mediumMaxWidth = 8;
      const truncatedName = rawName.length > mediumMaxWidth
        ? rawName.slice(0, mediumMaxWidth - 1) + '\u2026'
        : rawName;
      tabContent = `[${indexDisplay}:${truncatedName} ${statusEmoji} `;
      closingBracket = ']';
      break;
    }
    case 'wide':
    default: {
      // Full format: [1:project-name ✅ 45%]
      const truncatedName = rawName.length > maxNameWidth
        ? rawName.slice(0, maxNameWidth - 1) + '\u2026'
        : rawName;
      tabContent = `[${indexDisplay}:${truncatedName} ${statusEmoji} `;
      closingBracket = ']';
      break;
    }
  }

  // Selected tabs (whether active or not) get underline - no background colors
  if (isSelected) {
    return (
      <Text>
        <Text underline>{tabContent}</Text>
        <Text underline color={contextColor}>{contextPct}</Text>
        {closingBracket && <Text underline>{closingBracket}</Text>}
      </Text>
    );
  }

  if (isActive) {
    // Active only: underline (shows "this is in main pane")
    return (
      <Text>
        <Text underline>{tabContent}</Text>
        <Text underline color={contextColor}>{contextPct}</Text>
        {closingBracket && <Text underline>{closingBracket}</Text>}
      </Text>
    );
  }

  // Normal: default colors with context color
  // External sessions are dimmed to show they're not managed by vibe-term
  if (isExternal) {
    return (
      <Text>
        <Text dimColor>{tabContent}</Text>
        <Text dimColor color={contextColor}>{contextPct}</Text>
        {closingBracket && <Text dimColor>{closingBracket}</Text>}
      </Text>
    );
  }

  return (
    <Text>
      <Text>{tabContent}</Text>
      <Text color={contextColor}>{contextPct}</Text>
      {closingBracket && <Text>{closingBracket}</Text>}
    </Text>
  );
}
