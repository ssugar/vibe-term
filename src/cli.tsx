#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import App from './app.js';
import { useAppStore } from './stores/appStore.js';

const cli = meow(
  `
  Usage
    $ cc-tui-hud

  Options
    --refresh, -r  Refresh interval in seconds (default: 2)

  Examples
    $ cc-tui-hud
    $ cc-tui-hud --refresh 5
    $ cc-tui-hud -r 1
`,
  {
    importMeta: import.meta,
    flags: {
      refresh: {
        type: 'number',
        shortFlag: 'r',
        default: 2,
      },
    },
  }
);

// Convert seconds to milliseconds
const refreshInterval = cli.flags.refresh * 1000;

// Track Ctrl+C presses for two-stage exit
let ctrlCPressed = false;
let ctrlCTimeout: NodeJS.Timeout | null = null;

// Render the app with Ctrl+C handling disabled (we handle it manually)
const { unmount, waitUntilExit } = render(
  <App refreshInterval={refreshInterval} />,
  { exitOnCtrlC: false }
);

// Graceful shutdown function
const shutdown = () => {
  unmount();
  process.exit(0);
};

// Handle SIGINT (Ctrl+C) with two-stage exit per CONTEXT.md
process.on('SIGINT', () => {
  if (ctrlCPressed) {
    // Second Ctrl+C - force exit
    shutdown();
  } else {
    // First Ctrl+C - show warning via store
    ctrlCPressed = true;
    useAppStore.getState().setConfirmingExit(true);

    // Reset after 2 seconds if no second Ctrl+C
    ctrlCTimeout = setTimeout(() => {
      ctrlCPressed = false;
      useAppStore.getState().setConfirmingExit(false);
    }, 2000);
  }
});

// Handle SIGTERM
process.on('SIGTERM', shutdown);

// Wait for app to exit (triggered by exit() in useApp hook)
await waitUntilExit();

// Clean up timeout if still pending
if (ctrlCTimeout) {
  clearTimeout(ctrlCTimeout);
}
