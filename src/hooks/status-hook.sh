#!/bin/bash
# Claude Code hook for HUD status tracking
# Writes status updates to ~/.claude-hud/sessions/

# Don't use set -e, we want graceful degradation
# set -e

# Read hook input from stdin
INPUT=$(cat)

# Parse fields using jq (commonly available)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty')

# Ensure we have required fields
if [ -z "$SESSION_ID" ] || [ -z "$HOOK_EVENT" ]; then
  exit 0  # Silent exit, don't break Claude
fi

# State directory and file
STATE_DIR="$HOME/.claude-hud/sessions"
STATE_FILE="$STATE_DIR/${SESSION_ID}.json"
mkdir -p "$STATE_DIR"

# Handle SessionEnd - clean up state file
if [ "$HOOK_EVENT" = "SessionEnd" ]; then
  rm -f "$STATE_FILE"
  exit 0
fi

# Read existing state if it exists (for subagent count, mainModel, notification preservation)
SUBAGENT_COUNT=0
EXISTING_MODEL=""
MAIN_MODEL=""
EXISTING_NOTIFICATION=""
if [ -f "$STATE_FILE" ]; then
  SUBAGENT_COUNT=$(jq -r '.subagentCount // 0' "$STATE_FILE" 2>/dev/null || echo "0")
  EXISTING_MODEL=$(jq -r '.model // empty' "$STATE_FILE" 2>/dev/null || echo "")
  MAIN_MODEL=$(jq -r '.mainModel // empty' "$STATE_FILE" 2>/dev/null || echo "")
  EXISTING_NOTIFICATION=$(jq -r '.notification // empty' "$STATE_FILE" 2>/dev/null || echo "")
fi

# Determine status and subagent count changes based on hook event
STATUS=""
NOTIFICATION=""
case "$HOOK_EVENT" in
  SessionStart)
    # Initialize state file on session start for faster detection
    STATUS="idle"
    ;;
  UserPromptSubmit)
    STATUS="working"
    ;;
  PreToolUse)
    # Tool is about to execute - this means any prior permission request was resolved
    # (either approved, rejected, or Claude moved on). Clear blocked state.
    STATUS="tool"
    # Notification cleared in handling section below (PreToolUse always clears)
    ;;
  PermissionRequest)
    STATUS="blocked"
    ;;
  PostToolUse)
    STATUS="working"
    ;;
  PostToolUseFailure)
    STATUS="working"
    ;;
  Stop)
    STATUS="idle"
    ;;
  SubagentStart)
    STATUS="working"
    SUBAGENT_COUNT=$((SUBAGENT_COUNT + 1))
    ;;
  SubagentStop)
    SUBAGENT_COUNT=$((SUBAGENT_COUNT - 1))
    if [ "$SUBAGENT_COUNT" -lt 0 ]; then
      SUBAGENT_COUNT=0
    fi
    # Keep existing status or default to working if subagents still running
    if [ "$SUBAGENT_COUNT" -gt 0 ]; then
      STATUS="working"
    fi
    ;;
  Notification)
    # Claude sent a notification - store for HUD display
    # Extract message from input if available
    NOTIFICATION=$(echo "$INPUT" | jq -r '.message // empty')
    # Don't change status, just record notification
    ;;
  *)
    # Unknown event, don't update
    exit 0
    ;;
esac

# If no status change determined (e.g., SubagentStop with no remaining subagents),
# read existing status
if [ -z "$STATUS" ] && [ -f "$STATE_FILE" ]; then
  STATUS=$(jq -r '.status // "idle"' "$STATE_FILE" 2>/dev/null || echo "idle")
fi
# Default to idle if still no status
if [ -z "$STATUS" ]; then
  STATUS="idle"
fi

# Extract model from transcript if available (best effort)
TRANSCRIPT_MODEL=""
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  # Get model from last assistant message that has one
  TRANSCRIPT_MODEL=$(tail -100 "$TRANSCRIPT_PATH" 2>/dev/null | grep -o '"model":"[^"]*"' | tail -1 | sed 's/"model":"//;s/"$//' || true)
  # Simplify model name
  if echo "$TRANSCRIPT_MODEL" | grep -qi "opus"; then
    TRANSCRIPT_MODEL="opus"
  elif echo "$TRANSCRIPT_MODEL" | grep -qi "haiku"; then
    TRANSCRIPT_MODEL="haiku"
  elif echo "$TRANSCRIPT_MODEL" | grep -qi "sonnet"; then
    TRANSCRIPT_MODEL="sonnet"
  else
    TRANSCRIPT_MODEL=""
  fi
fi

# Main model handling:
# - Only update mainModel on UserPromptSubmit (when user is definitely in main session)
# - This prevents subagent models from overwriting the main session's model
if [ "$HOOK_EVENT" = "UserPromptSubmit" ] && [ -n "$TRANSCRIPT_MODEL" ]; then
  MAIN_MODEL="$TRANSCRIPT_MODEL"
fi

# If mainModel not set yet, use transcript model as initial value
if [ -z "$MAIN_MODEL" ] && [ -n "$TRANSCRIPT_MODEL" ]; then
  MAIN_MODEL="$TRANSCRIPT_MODEL"
fi

# For display, use mainModel (the user's main session model)
MODEL="$MAIN_MODEL"

# Fall back to existing model if we still don't have one
if [ -z "$MODEL" ] && [ -n "$EXISTING_MODEL" ]; then
  MODEL="$EXISTING_MODEL"
fi

# Notification handling:
# - New notification: use it
# - UserPromptSubmit: clear old notification (user acknowledged)
# - PreToolUse: clear notification (tool is running, permission was resolved)
# - Otherwise: preserve existing notification
if [ -n "$NOTIFICATION" ]; then
  : # Use new notification
elif [ "$HOOK_EVENT" = "UserPromptSubmit" ] || [ "$HOOK_EVENT" = "PreToolUse" ]; then
  NOTIFICATION=""  # Clear on new prompt or when tool starts (permission resolved)
else
  NOTIFICATION="$EXISTING_NOTIFICATION"  # Preserve existing
fi

# Write state file (atomic write via temp file)
TEMP_FILE="$STATE_FILE.tmp.$$"

# Format model and mainModel as JSON (null if empty, quoted string otherwise)
MODEL_JSON="null"
if [ -n "$MODEL" ]; then
  MODEL_JSON="\"$MODEL\""
fi
MAIN_MODEL_JSON="null"
if [ -n "$MAIN_MODEL" ]; then
  MAIN_MODEL_JSON="\"$MAIN_MODEL\""
fi

cat > "$TEMP_FILE" << EOF
{
  "status": "$STATUS",
  "model": $MODEL_JSON,
  "mainModel": $MAIN_MODEL_JSON,
  "cwd": "$CWD",
  "sessionId": "$SESSION_ID",
  "subagentCount": $SUBAGENT_COUNT,
  "notification": "$NOTIFICATION",
  "transcriptPath": "$TRANSCRIPT_PATH",
  "lastUpdate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

mv "$TEMP_FILE" "$STATE_FILE"

# Exit cleanly (don't affect Claude's behavior)
exit 0
