# Phase 4: Context Window - Research

**Researched:** 2026-01-23
**Domain:** Context window usage display via JSONL parsing and terminal progress bars
**Confidence:** HIGH

## Summary

This phase adds context window usage display to each session row in the HUD. Research identified two possible data sources: Claude Code's statusline API (authoritative but only available inside Claude Code) and JSONL transcript parsing (external, requires calculation). Since the HUD runs as an external process, **JSONL parsing is the required approach**.

The JSONL transcript files contain cumulative token usage data in assistant messages. The last non-sidechain message's usage fields provide current context consumption. Combined with model-specific context window limits (200K standard for all models), percentage can be calculated.

For visual display, Ink's Text component supports chalk colors natively. Unicode block characters (U+2588 family) enable smooth progress bar rendering. Color can be conditionally applied based on thresholds.

**Primary recommendation:** Parse JSONL transcripts to extract token usage, calculate percentage against 200K context window, render with colored Unicode block progress bar in SessionRow.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ink | 6.x | Already in project | Text component supports color prop for stoplight colors |
| fs (Node) | N/A | JSONL file reading | Sync read for transcript parsing during refresh |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| readline (Node) | N/A | Line-by-line JSONL parsing | Built-in, no external dependency needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONL parsing | Statusline API | Statusline only works inside Claude Code; HUD runs externally |
| Custom JSONL parser | ccusage library | ccusage is CLI tool, not embeddable library; simpler to parse directly |
| ink-progress-bar | Custom component | ink-progress-bar is 7 years old, simpler to build custom with Text + block chars |

**Installation:**
```bash
# No new dependencies required
# Ink already in project, Node fs/readline built-in
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   └── contextService.ts       # NEW: JSONL parsing for context usage
├── components/
│   ├── SessionRow.tsx          # MODIFY: Add ContextMeter component
│   └── ContextMeter.tsx        # NEW: Progress bar with stoplight colors
├── stores/
│   └── types.ts                # ALREADY HAS contextUsage field
└── hooks/
    └── useSessions.ts          # MODIFY: Include context in refresh
```

### Pattern 1: JSONL Parsing for Token Usage

**What:** Read transcript JSONL, find last valid assistant message, extract cumulative token usage
**When to use:** Every refresh cycle (2 seconds) to get current context consumption
**Example:**
```typescript
// Source: Research finding - JSONL structure from actual Claude Code transcripts
interface TokenUsage {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

interface TranscriptEntry {
  type: string;
  isSidechain?: boolean;
  isApiErrorMessage?: boolean;
  message?: {
    usage?: TokenUsage;
  };
  timestamp?: string;
}

function getContextUsage(transcriptPath: string): number | null {
  // Read file, parse lines as JSON
  // Filter: type === 'assistant' && !isSidechain && !isApiErrorMessage && has usage
  // Get most recent by timestamp
  // Sum: input_tokens + cache_creation_input_tokens + cache_read_input_tokens
  // Divide by CONTEXT_WINDOW_SIZE (200000) * 100 for percentage
}
```

### Pattern 2: Unicode Block Progress Bar

**What:** Render progress bar using Unicode block elements for smooth visual
**When to use:** Displaying context usage in SessionRow
**Example:**
```typescript
// Source: mike42.me/blog/2018-06-make-better-cli-progress-bars-with-unicode-block-characters
const BLOCKS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█']; // 0-8 eighths

function renderBar(percent: number, width: number): string {
  const filled = (percent / 100) * width;
  const fullBlocks = Math.floor(filled);
  const partialEighths = Math.round((filled - fullBlocks) * 8);

  const bar = '█'.repeat(fullBlocks) +
              (partialEighths > 0 ? BLOCKS[partialEighths] : '') +
              ' '.repeat(width - fullBlocks - (partialEighths > 0 ? 1 : 0));
  return bar;
}
```

### Pattern 3: Stoplight Color Selection

**What:** Map percentage to color based on thresholds
**When to use:** Coloring progress bar and percentage text
**Example:**
```typescript
// Source: 04-CONTEXT.md decisions
function getStoplightColor(percent: number): 'green' | 'yellow' | 'red' {
  if (percent < 30) return 'green';
  if (percent < 70) return 'yellow';
  return 'red';
}
```

### Pattern 4: Transcript Path Discovery

**What:** Find transcript path for a session given its cwd
**When to use:** Linking detected Claude processes to their transcripts
**Example:**
```typescript
// Source: Research finding - Claude Code project directory structure
// ~/.claude/projects/{encoded-project-path}/{session-id}.jsonl
function findTranscriptPath(cwd: string): string | null {
  const projectDir = path.join(os.homedir(), '.claude', 'projects');
  const encodedPath = cwd.replace(/\//g, '-'); // e.g., -home-ssugar-claude-cc-tui-hud
  const sessionDir = path.join(projectDir, encodedPath);

  // Find most recently modified .jsonl that's not an agent file
  // agent-*.jsonl are subagent transcripts, skip them
  // Return path to main session transcript
}
```

### Anti-Patterns to Avoid

- **Parsing entire JSONL on each refresh:** Only need last few lines with usage data; use reverse read or tail
- **Summing all usage entries:** Anthropic API returns cumulative totals; use last entry only
- **Including sidechain entries:** Subagent context is separate; filter `isSidechain: true`
- **Hardcoding 200K:** Store context window size as constant, may need model-specific values later
- **Blocking main thread:** JSONL files can be 10-20MB; consider async read or streaming

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token counting | Manual calculation | JSONL usage field | Anthropic calculates cumulative usage authoritatively |
| Color terminal output | ANSI escape codes | Ink Text color prop | Ink handles terminal compatibility |
| Progress bar rendering | ASCII chars | Unicode block elements | Higher resolution, smoother visual |

**Key insight:** Claude Code already calculates and stores cumulative token usage in JSONL transcripts. Don't try to count tokens yourself - read what Claude Code recorded.

## Common Pitfalls

### Pitfall 1: Stale Transcript Detection

**What goes wrong:** HUD shows old context percentage because session ended or transcript hasn't updated
**Why it happens:** Transcript file exists but session may be dead, or file timestamp is old
**How to avoid:**
- Check file modification time against lastUpdate threshold (5 minutes)
- If transcript is stale, show 'N/A' or '?' indicator
- Cross-reference with hook state lastUpdate
**Warning signs:** Context percentage never changes, or shows for ended sessions

### Pitfall 2: Subagent Transcript Confusion

**What goes wrong:** Parsing agent-*.jsonl instead of main session transcript
**Why it happens:** Project directory contains both main transcripts (UUID.jsonl) and subagent transcripts (agent-*.jsonl)
**How to avoid:**
- Filter out files matching `agent-*.jsonl` pattern
- Use hook state sessionId to find exact transcript file
- Fall back to most recently modified non-agent JSONL
**Warning signs:** Context percentage jumps unexpectedly, or shows subagent's context

### Pitfall 3: Large File Performance

**What goes wrong:** HUD becomes sluggish parsing 20MB JSONL files
**Why it happens:** Reading entire file to find last usage entry
**How to avoid:**
- Read file in reverse (last N bytes first)
- Or use Node streams with limit
- Cache parsed result, only re-parse if file mtime changed
**Warning signs:** Refresh takes >100ms, UI stutters

### Pitfall 4: Missing Usage Data

**What goes wrong:** JSONL exists but no usage entries found
**Why it happens:** Session just started, or only user messages so far (no assistant response yet)
**How to avoid:**
- Return null/undefined when no usage data found
- Display 'N/A' or '0%' gracefully
- Don't crash or show error
**Warning signs:** All sessions show 'N/A' initially

### Pitfall 5: Encoded Path Mismatch

**What goes wrong:** Can't find transcript for a session
**Why it happens:** Path encoding doesn't match expected pattern (slashes to dashes)
**How to avoid:**
- Verify encoding matches: `/home/user/project` -> `-home-user-project`
- Handle edge cases: trailing slashes, special characters
- Log when transcript not found for debugging
**Warning signs:** Some sessions show 'N/A' despite being active

## Code Examples

Verified patterns from official sources:

### JSONL Entry Structure (from actual Claude Code transcript)
```typescript
// Source: Examination of ~/.claude/projects/.../session.jsonl
interface AssistantEntry {
  type: 'assistant';
  isSidechain: boolean;
  isApiErrorMessage?: boolean;
  userType: 'external';
  cwd: string;
  sessionId: string;
  message: {
    model: string;  // e.g., "claude-opus-4-5-20251101"
    usage: {
      input_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
      output_tokens: number;
    };
  };
  timestamp: string;  // ISO 8601
}
```

### Ink Text with Conditional Color
```typescript
// Source: github.com/vadimdemedes/ink documentation
import { Text } from 'ink';

function ContextMeter({ percent }: { percent: number }) {
  const color = percent < 30 ? 'green' : percent < 70 ? 'yellow' : 'red';
  const bar = renderProgressBar(percent, 20);

  return (
    <Text color={color}>
      {bar} {percent}%
    </Text>
  );
}
```

### Unicode Block Characters Reference
```typescript
// Source: mike42.me/blog/2018-06-make-better-cli-progress-bars-with-unicode-block-characters
const FULL_BLOCK = '\u2588';  // █ (100%)
const BLOCKS = [
  '',           // 0/8
  '\u258F',     // ▏ 1/8
  '\u258E',     // ▎ 2/8
  '\u258D',     // ▍ 3/8
  '\u258C',     // ▌ 4/8
  '\u258B',     // ▋ 5/8
  '\u258A',     // ▊ 6/8
  '\u2589',     // ▉ 7/8
  '\u2588',     // █ 8/8
];
```

### Context Window Sizes
```typescript
// Source: docs.claude.com/en/docs/build-with-claude/context-windows
// All Claude 4.5 models (Opus, Sonnet, Haiku) have 200K standard context
const CONTEXT_WINDOW_SIZE = 200_000;

// Note: Sonnet 4/4.5 supports 1M tokens in beta for tier 4 orgs
// For simplicity, use 200K as standard; can make configurable later
```

### Hook State Integration
```typescript
// Source: Existing codebase pattern in hookStateService.ts
// Extend HookSessionState interface to include transcript path
interface HookSessionState {
  // ... existing fields
  transcriptPath?: string;  // From hook input, enables direct JSONL access
}

// Hook already receives transcript_path - store it in state file
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSONL parsing only | Statusline API | Claude Code 2.x (2025) | Internal tools can use pre-calculated percentages |
| Manual token counting | usage field in JSONL | Claude Code 1.x | No need to estimate tokens |
| ASCII progress bars | Unicode block elements | 2018+ | Smoother visual in modern terminals |

**Deprecated/outdated:**
- Attempting to count tokens manually: usage field is authoritative
- Using old JSONL format assumptions: field names may have changed, always verify

## Open Questions

1. **Gradient bar implementation**
   - What we know: Context decisions specify gradient (green->yellow->red) within the bar
   - What's unclear: Whether Ink supports per-character coloring in a single Text element
   - Recommendation: Start with single-color bar matching threshold; gradient is enhancement if feasible

2. **1M context window support**
   - What we know: Sonnet 4/4.5 supports 1M tokens in beta for tier 4 orgs
   - What's unclear: How to detect if session has 1M vs 200K window
   - Recommendation: Default to 200K; make context window size configurable or detectable from model

3. **Transcript path in hook state**
   - What we know: Hooks receive transcript_path in input
   - What's unclear: Whether we should store it in state file or compute from cwd
   - Recommendation: Store in hook state file for direct access; reduces computation on refresh

## Sources

### Primary (HIGH confidence)
- code.claude.com/docs/en/statusline - Statusline API JSON structure with context_window fields
- code.claude.com/docs/en/hooks - Hook input payload fields
- Examination of actual JSONL files at ~/.claude/projects/

### Secondary (MEDIUM confidence)
- codelynx.dev/posts/calculate-claude-code-context - JSONL parsing approach, token field names
- github.com/vadimdemedes/ink - Text component color prop
- mike42.me/blog/2018-06-make-better-cli-progress-bars-with-unicode-block-characters - Unicode block reference

### Tertiary (LOW confidence)
- github.com/ryoppippi/ccusage - Alternative approach for validation
- WebSearch results on model context window sizes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing Ink + Node built-ins, patterns verified
- Architecture: HIGH - JSONL structure verified from actual files, patterns clear
- Pitfalls: MEDIUM - Based on extrapolation from research, not production experience
- Context window sizes: MEDIUM - Official docs confirm 200K standard, 1M beta unclear

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (stable domain, 30 days)

---

*Phase: 04-context-window*
*Research completed: 2026-01-23*
