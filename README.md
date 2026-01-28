# vibe-term

A tmux-integrated terminal multiplexer for managing multiple Claude Code sessions.

## The Problem

When running multiple Claude Code sessions across different projects, you lose track of which ones need attention. Sessions get blocked waiting for input, context windows fill up, and you waste time alt-tabbing through terminals trying to find the one that needs you.

## What vibe-term Does

vibe-term provides an always-visible HUD strip showing all your Claude sessions as tabs. At a glance you see:

- Which sessions are working, idle, or blocked
- Context window usage (with stoplight colors)
- Project directory for each session

One keypress switches between sessions. The HUD stays visible while you work.

## Requirements

- Node.js 20+
- tmux
- Claude Code CLI installed and configured
- Linux, macOS, or WSL2

## Installation

Clone the repository and build:

```bash
git clone https://github.com/ssugar/vibe-term.git
cd vibe-term
npm install
npm run build
```

Run directly:

```bash
npm run dev
```

Or link globally:

```bash
npm link
vibe-term
```

## Hooks Setup

vibe-term relies on Claude Code hooks to track session status. Add the status hook to your global Claude settings (`~/.claude/settings.json`):

```json
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "/path/to/vibe-term/src/hooks/status-hook.sh" }] }],
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "/path/to/vibe-term/src/hooks/status-hook.sh" }] }],
    "PreToolUse": [{ "hooks": [{ "type": "command", "command": "/path/to/vibe-term/src/hooks/status-hook.sh" }] }],
    "PostToolUse": [{ "hooks": [{ "type": "command", "command": "/path/to/vibe-term/src/hooks/status-hook.sh" }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "/path/to/vibe-term/src/hooks/status-hook.sh" }] }],
    "SessionEnd": [{ "hooks": [{ "type": "command", "command": "/path/to/vibe-term/src/hooks/status-hook.sh" }] }]
  }
}
```

Replace `/path/to/vibe-term` with the actual path where you cloned the repository.

### Project-Level Settings Override

Claude Code settings don't merge between global and project-level configs. If a project has its own `.claude/settings.json` or `.claude/settings.local.json`, the global hooks won't run for that project. See [#17017](https://github.com/anthropics/claude-code/issues/17017) and [#19487](https://github.com/anthropics/claude-code/issues/19487).

To add the HUD hook to all your existing projects:

```bash
./scripts/add-hud-hooks.sh ~/path/to/your/projects
```

This script finds all project-level Claude settings and adds the status hook to each one.

## Usage

Start vibe-term from any terminal:

```bash
vibe-term
```

vibe-term creates a tmux session with the HUD strip at the top and your active Claude session below. Sessions you spawn from within vibe-term are managed automatically. External Claude sessions running in other tmux panes are also detected and shown in the HUD.

### Options

```
--refresh, -r  Refresh interval in seconds (default: 2)
```

## Keybindings

| Key | Action |
|-----|--------|
| `j` / `↓` | Select next session |
| `k` / `↑` | Select previous session |
| `←` / `→` | Navigate tabs |
| `1-9` | Jump to session by number |
| `Enter` | Switch to selected session |
| `b` | Return focus to HUD |
| `n` | Spawn new Claude session |
| `q` | Quit (detach or kill) |
| `?` | Show help |
| `Ctrl+C` | Exit (press twice to force) |

### Spawning Sessions

Press `n` to spawn a new Claude session. Enter a directory path (tab completion supported) and press Enter. If the directory doesn't exist, you'll be prompted to create it.

## Configuration

vibe-term looks for `~/.config/vibe-term/config.json`:

```json
{
  "hudPosition": "top",
  "hudHeight": 3
}
```

| Option | Values | Default |
|--------|--------|---------|
| `hudPosition` | `"top"`, `"bottom"` | `"top"` |
| `hudHeight` | Number of rows | `3` |

## How It Works

vibe-term uses Claude Code's hook system to detect session status. When Claude is working, waiting for input, or blocked, the hooks report state changes that vibe-term reads to update the HUD in real-time.

Sessions are managed through tmux pane operations. Internal sessions (spawned from vibe-term) live in a scratch window and are swapped into the main view when selected. External sessions (Claude running in other tmux panes) are detected and can be focused directly.

## Contributing

Issues and pull requests welcome at [github.com/ssugar/vibe-term](https://github.com/ssugar/vibe-term).

## License

ISC
