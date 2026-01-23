#!/bin/bash
# Install status hooks to all projects with .claude/ directories
#
# This script solves the problem where Claude Code doesn't merge global hooks
# with project-level settings. Projects with a .claude/ directory but no hooks
# defined in settings.json will not receive global hooks.
#
# Solution: Add status hooks to each project's .claude/settings.json that point
# to the global status-hook.sh script.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATUS_HOOK="$SCRIPT_DIR/status-hook.sh"
PROJECTS_DIR="$HOME/claude"

# Status hook configuration to add
read -r -d '' HOOKS_JSON << 'EOF' || true
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "STATUS_HOOK_PATH"
          }
        ]
      }
    ],
    "PermissionRequest": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "STATUS_HOOK_PATH"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "STATUS_HOOK_PATH"
          }
        ]
      }
    ],
    "PostToolUseFailure": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "STATUS_HOOK_PATH"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "STATUS_HOOK_PATH"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "STATUS_HOOK_PATH"
          }
        ]
      }
    ],
    "SubagentStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "STATUS_HOOK_PATH"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "STATUS_HOOK_PATH"
          }
        ]
      }
    ]
  }
}
EOF

# Replace placeholder with actual path
HOOKS_JSON="${HOOKS_JSON//STATUS_HOOK_PATH/$STATUS_HOOK}"

echo "Status Hook Installer"
echo "===================="
echo ""
echo "Status hook path: $STATUS_HOOK"
echo "Scanning projects in: $PROJECTS_DIR"
echo ""

# Check if status hook exists
if [ ! -f "$STATUS_HOOK" ]; then
    echo "ERROR: Status hook not found at $STATUS_HOOK"
    exit 1
fi

# Track counts
UPDATED=0
SKIPPED=0
CREATED=0

# Scan for projects with .claude directories
for project in "$PROJECTS_DIR"/*/; do
    project_name=$(basename "$project")
    claude_dir="$project/.claude"
    settings_file="$claude_dir/settings.json"

    # Skip if no .claude directory
    if [ ! -d "$claude_dir" ]; then
        continue
    fi

    # Check if settings.json exists and has hooks
    if [ -f "$settings_file" ]; then
        # Check if it already has status hooks (look for our specific hook events)
        if grep -q "UserPromptSubmit" "$settings_file" 2>/dev/null; then
            echo "SKIP: $project_name (already has hooks)"
            SKIPPED=$((SKIPPED + 1))
            continue
        fi

        # Has settings.json but no hooks - need to merge
        echo "MERGE: $project_name (adding hooks to existing settings.json)"

        # Use jq to merge hooks into existing settings
        if command -v jq &> /dev/null; then
            # Create merged file
            jq -s '.[0] * .[1]' "$settings_file" <(echo "$HOOKS_JSON") > "$settings_file.tmp"
            mv "$settings_file.tmp" "$settings_file"
            UPDATED=$((UPDATED + 1))
        else
            echo "  WARNING: jq not installed, cannot merge. Creating new file."
            # Backup existing and create new
            cp "$settings_file" "$settings_file.backup"
            echo "$HOOKS_JSON" > "$settings_file"
            CREATED=$((CREATED + 1))
        fi
    else
        # No settings.json - create one
        echo "CREATE: $project_name (creating settings.json with hooks)"
        echo "$HOOKS_JSON" > "$settings_file"
        CREATED=$((CREATED + 1))
    fi
done

echo ""
echo "===================="
echo "Summary:"
echo "  Created: $CREATED"
echo "  Updated: $UPDATED"
echo "  Skipped: $SKIPPED"
echo ""
echo "Done! Status hooks installed."
echo ""
echo "Note: You may need to restart Claude Code sessions for hooks to take effect."
