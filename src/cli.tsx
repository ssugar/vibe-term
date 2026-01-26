#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import App from './app.js';
import { useAppStore } from './stores/appStore.js';
import { ensureTmuxEnvironment, TMUX_SESSION_NAME } from './startup.js';
import { loadConfig } from './services/configService.js';
import { configureSession, createHudLayout } from './services/tmuxService.js';

// Get absolute path to this CLI script (for tmux hooks)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliPath = join(__dirname, 'cli.js');

const cli = meow(
  `
  Usage
    $ claude-terminal

  Options
    --refresh, -r  Refresh interval in seconds (default: 2)

  Examples
    $ claude-terminal
    $ claude-terminal --refresh 5
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

// Step 1: Ensure tmux environment
const startupResult = ensureTmuxEnvironment();

if (!startupResult.success) {
  console.error(startupResult.error);
  process.exit(1);
}

if (!startupResult.shouldRenderInk) {
  // Returned from tmux attach/new-session (user detached or killed)
  process.exit(0);
}

// Step 2: Load config
const config = loadConfig();

// Step 3: Configure tmux session (async, but we're now inside tmux)
// Pass cliPath so the attach hook can restart HUD if needed
await configureSession(TMUX_SESSION_NAME, cliPath);

// Step 4: Create HUD layout
const layout = await createHudLayout(config.hudPosition, config.hudHeight);

// Step 5: Check terminal size and warn if too small
const { rows } = process.stdout;
if (rows && rows < 10) {
  console.error(
    `Warning: Terminal height (${rows} rows) is very small. HUD may not display correctly.`
  );
}

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
