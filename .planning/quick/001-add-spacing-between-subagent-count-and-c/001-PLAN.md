---
phase: quick-001
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/components/SessionRow.tsx]
autonomous: true

must_haves:
  truths:
    - "Context bars align vertically across all session rows regardless of subagent count"
    - "Rows with no subagents have same total width before context meter as rows with subagents"
  artifacts:
    - path: "src/components/SessionRow.tsx"
      provides: "Fixed-width subagent display column"
      contains: "padStart"
  key_links: []
---

<objective>
Add fixed-width spacing for the subagent count column so context bars align across all rows.

Purpose: Currently, the subagent indicator (+N) has variable width - empty when no subagents, 2-3 chars when present. This causes context meters to misalign between rows.
Output: SessionRow.tsx with consistent 3-character subagent column width.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@src/components/SessionRow.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix subagent column width for consistent alignment</name>
  <files>src/components/SessionRow.tsx</files>
  <action>
    Update SessionRow.tsx to use a fixed 3-character width for the subagent display column:

    1. Define a constant for subagent column width: `const subagentWidth = 3;`

    2. Update the subagentDisplay calculation to always pad to fixed width:
       - If subagentCount > 0: show `+N` padded to 3 chars (e.g., "+1 ", "+2 ", "+10")
       - If subagentCount = 0: show 3 spaces ("   ")

    3. Update all three row rendering paths (blocked, selected, normal):

       For BLOCKED rows (lines 74-79):
       - Currently conditionally renders subagent. Change to always render the padded value.
       - Replace the conditional `{subagentDisplay && (...)}` with unconditional render using padded value.

       For SELECTED rows (lines 119-124):
       - Currently shows subagentDisplay or 2 spaces. Change to use 3-char padded value.
       - Remove the ternary, just render the padded subagent text.

       For NORMAL rows (lines 167-172):
       - Same change - use the 3-char padded value unconditionally.

    Implementation approach:
    ```tsx
    // After modelDisplay calculation, add:
    const subagentWidth = 3;
    const subagentDisplay = session.subagentCount > 0
      ? `+${session.subagentCount}`.padEnd(subagentWidth, ' ')
      : ' '.repeat(subagentWidth);
    ```

    Then in each render path, simply render:
    ```tsx
    <Text color={session.subagentCount > 0 ? "yellow" : undefined} bold={session.subagentCount > 0}>
      {subagentDisplay}
    </Text>
    ```

    This ensures exactly 3 characters are always rendered regardless of subagent count.
  </action>
  <verify>
    Run TypeScript check: `npm run build` or `npx tsc --noEmit`
    Manual verification: Run the HUD with `npm start` and observe that context bars align across rows with and without subagents.
  </verify>
  <done>
    All session rows have context meters starting at the same column position. Rows without subagents show 3 spaces; rows with subagents show "+N " padded to 3 chars.
  </done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors
- Visual inspection confirms context meters align vertically
- Subagent indicators still show in yellow when present
</verification>

<success_criteria>
- Context bars align across all rows regardless of subagent count
- No visual regression in subagent display (still yellow, bold when present)
- Build passes without errors
</success_criteria>

<output>
After completion, respond with changes made and verification results.
</output>
