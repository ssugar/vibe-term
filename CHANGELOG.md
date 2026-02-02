# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.3.0](https://github.com/ssugar/vibe-term/compare/v1.2.0...v1.3.0) (2026-02-02)

### Features

* **cli:** `vibe-term setup` command to install global hooks
* **cli:** `vibe-term audit` command to scan projects for hook conflicts
* **cli:** `vibe-term fix` command to intelligently merge hooks
* **cli:** JSON output mode (`--json`) for all commands
* **cli:** Dry-run by default for fix command with `--apply` to execute
* **cli:** Per-project confirmation prompts with `--yes` to skip
* **cli:** Action suggestions guide users through setup -> audit -> fix workflow

### Bug Fixes

* Proper backup validation (read-back and parse after write)
* Sessions-index.json resolution for accurate project paths


## [1.2.0](https://github.com/ssugar/vibe-term/compare/v1.1.0...v1.2.0) (2026-01-30)

### Features

* **tmux:** Integrated terminal with managed tmux session
* **ui:** Horizontal tab strip replaces full-screen list
* **pane:** Sessions run in bottom pane with native tmux switching
* **spawn:** `n` key spawns new Claude session with directory picker
* **detection:** External tmux sessions running Claude appear automatically
* **cleanup:** Dead sessions automatically removed from HUD
* **navigation:** `Ctrl+h` returns to HUD from any pane


## [1.1.0](https://github.com/ssugar/vibe-term/releases/tag/v1.1.0) (2026-01-25)

### Features

* **core:** Terminal HUD for monitoring Claude Code sessions
* **detection:** Detect running Claude instances across tmux and terminals
* **status:** Working/Idle/Blocked status via hooks integration
* **context:** Context window usage percentage with stoplight colors
* **navigation:** Keyboard navigation (j/k, arrows, 1-9 hotkeys)
* **jump:** Enter key switches to selected session
* **platform:** Linux, macOS, and WSL2 support
