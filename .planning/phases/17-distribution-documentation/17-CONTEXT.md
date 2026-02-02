# Phase 17: Distribution & Documentation - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Make vibe-term installable via npm and provide clear documentation for users. Package the tool for global installation with minimal footprint, and write README documentation covering installation, usage, and the hook management workflow.

</domain>

<decisions>
## Implementation Decisions

### Package configuration
- Package name: `vibe-term` (matches current binary name)
- Binary name: `vibe-term` only (no short alias)
- Package description: TUI-focused — "Terminal HUD for managing Claude Code sessions"
- Include dist only — no TypeScript source files in package (smaller, faster install)

### README structure
- Open with "What it does" — brief explanation + screenshot, then install instructions
- Include screenshot showing TUI in action (static image, not GIF)
- CLI command documentation: minimal — one-liner per command with flags listed
- All documentation in README.md — no separate wiki or docs site

### Installation guidance
- Document prerequisites: Node.js (minimum version) + tmux
- Include platform-specific notes for macOS, Linux, and WSL2
- Include troubleshooting section for common issues (tmux not found, permission errors)
- Technical tone — concise, assume CLI proficiency

### Hook workflow documentation
- Minimal hook background — assume users know what Claude hooks are
- Explain setup → audit → fix as linear steps (1, 2, 3)
- Show sample output for key commands (audit, fix) so users know what to expect
- Briefly explain what vibe-term hooks track (session status: working/idle/blocked)

### Claude's Discretion
- Exact README section ordering after core sections
- Keywords and other npm package.json metadata
- Specific troubleshooting issues to document (based on known gotchas)
- Screenshot capture and placement

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for npm packaging and README structure.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-distribution-documentation*
*Context gathered: 2026-02-02*
