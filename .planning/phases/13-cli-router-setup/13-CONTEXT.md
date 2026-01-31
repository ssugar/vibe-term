# Phase 13: CLI Router & Setup Command - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

CLI subcommand routing (`vibe-term setup` vs `vibe-term` for TUI) and the setup command that installs global hooks to `~/.claude/settings.json` with automatic backup. Users can non-interactively install hooks for CI/automation with `--yes`.

</domain>

<decisions>
## Implementation Decisions

### Setup output & feedback
- Summary by default, verbose output with `-v` or `--verbose` flag
- Show list of files touched (Modified ~/.claude/settings.json, Created ~/.vibe-term/hooks.sh)
- After success, suggest running `vibe-term audit` as next step
- Use existing CLI utils pattern: picocolors + figures (green ✓, yellow ⚠, red ✗)

### Confirmation behavior
- Prompt before modifying settings.json by default: "This will modify ~/.claude/settings.json. Continue? [Y/n]"
- Default is Yes — pressing Enter proceeds
- `--yes` flag skips the prompt (single flag, no aliases like -y or --force)
- Verbose mode (`-v`) shows preview of changes before the prompt

### Error handling
- If ~/.claude/settings.json doesn't exist: error with message "Settings file not found. Run Claude Code first to create it."
- If settings.json already has hooks from another tool: merge intelligently (add vibe-term hooks alongside existing ones)
- If backup creation fails: abort setup entirely with message "Cannot create backup. Aborting to protect existing settings."
- Exit codes: 0 = success, 1 = error, 2 = user abort

### Idempotency
- If vibe-term hooks already installed: skip silently with "✓ Hooks already installed" and exit 0
- Detection method: check if settings.json hooks point to ~/.vibe-term/hooks.sh
- Only create backup if actually making changes (no backup if already installed)
- For ~/.vibe-term/hooks.sh: check version, only overwrite if newer version available

### Claude's Discretion
- Exact verbose output format and level of detail
- Version comparison mechanism for hooks.sh
- How to chain/merge existing hooks with vibe-term hooks

</decisions>

<specifics>
## Specific Ideas

- Intelligent hook merging: don't clobber existing hooks, chain vibe-term's alongside them
- Version checking for hooks.sh ensures users get updates without losing custom modifications

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-cli-router-setup*
*Context gathered: 2026-01-31*
