# Plan 03-04 Summary: Hooks-Based Status Detection

## Result: COMPLETE

**Duration:** ~30 min (including debugging and iterations)

## What Was Built

Replaced unreliable JSONL parsing with event-driven Claude Code hooks for accurate status detection.

### Deliverables

| Artifact | Purpose |
|----------|---------|
| `src/hooks/status-hook.sh` | Bash hook script capturing status events |
| `src/services/hookStateService.ts` | Service to read hook-written state files |
| `src/services/sessionBuilder.ts` | Updated to use hook state instead of JSONL |
| `~/.claude/settings.json` | Global hooks config for cross-project tracking |

### Commits

| Hash | Description |
|------|-------------|
| `27ea717` | Create status hook script |
| `ed73079` | Create hook state service |
| `db1ea38` | Update session builder to use hook state |
| `1757d68` | Add SessionEnd cleanup, subagent tracking hooks |
| `f65bd38` | Preserve main session model when subagents run |

## Technical Approach

### Hook Events Captured

| Event | Status Transition |
|-------|-------------------|
| `UserPromptSubmit` | → working |
| `PermissionRequest` | → blocked |
| `PostToolUse` | → working |
| `PostToolUseFailure` | → working |
| `Stop` | → idle |
| `SubagentStart` | → working, increment count |
| `SubagentStop` | → decrement count |
| `SessionEnd` | → delete state file |

### State File Structure

```json
{
  "status": "working|idle|blocked",
  "model": "opus|sonnet|haiku",
  "mainModel": "opus|sonnet|haiku",
  "cwd": "/path/to/project",
  "sessionId": "uuid",
  "subagentCount": 0,
  "lastUpdate": "2026-01-23T..."
}
```

### Key Decisions

1. **Hooks over JSONL parsing** - Event-driven is authoritative; JSONL format was undocumented and unreliable
2. **Global hooks** - Installed in `~/.claude/settings.json` for cross-project tracking
3. **mainModel preservation** - Only update on UserPromptSubmit to prevent subagent model overwrite
4. **Subagent count tracking** - Increment/decrement with visual indicator (+N)
5. **SessionEnd cleanup** - Remove state files when sessions terminate

## Issues Encountered

1. **JSONL format mismatch** - Initial approach used wrong path encoding and nested structure
2. **Permission denial stuck** - Added PostToolUseFailure hook to handle denied permissions
3. **Model overwrite** - Subagents were overwriting main session model; fixed with mainModel tracking
4. **Project-only hooks** - Sessions outside project weren't tracked; fixed with global hooks

## Verification

- [x] Working sessions show hourglass emoji
- [x] Idle sessions show checkmark emoji
- [x] Blocked sessions show stop sign with red background
- [x] Permission denial transitions back to working/idle
- [x] Subagent count displays correctly (+N indicator)
- [x] Main session model preserved during subagent activity
- [x] Sessions across all projects tracked (global hooks)

## Future Enhancements

- Display subagent model breakdown (e.g., "+1 haiku, +2 sonnet")
- Track subagent hierarchy/nesting
- Install script for easier global hooks setup on new machines
