---
phase: quick-002
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/components/SessionRow.tsx]
autonomous: true

must_haves:
  truths:
    - "Subagent column and context bars align vertically across all session rows regardless of model name length"
    - "Rows with 'opus' (4 chars) align with rows with 'sonnet' (6 chars) and 'unknown' (7 chars)"
  artifacts:
    - path: "src/components/SessionRow.tsx"
      provides: "Fixed-width model display column"
      contains: "modelWidth"
  key_links: []
---

<objective>
Add fixed-width spacing for the model name column so subagent indicators and context bars align across all rows.

Purpose: Currently, the model name has variable width - "opus" is 4 chars, "haiku" is 5 chars, "sonnet" is 6 chars, "unknown" is 7 chars. Quick task 001 fixed the subagent column to 3 chars, but the variable model width still causes misalignment upstream.

Output: SessionRow.tsx with consistent 7-character model column width (to accommodate "unknown" fallback).
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@src/components/SessionRow.tsx
@.planning/quick/001-add-spacing-between-subagent-count-and-c/001-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix model column width for consistent alignment</name>
  <files>src/components/SessionRow.tsx</files>
  <action>
    Update SessionRow.tsx to use a fixed 7-character width for the model display column:

    1. Define a constant for model column width after modelDisplay: `const modelWidth = 7;`

    2. Create a padded model display: `const paddedModel = modelDisplay.padEnd(modelWidth, ' ');`

    3. Update all three row rendering paths to use paddedModel instead of modelDisplay:

       For BLOCKED rows (line 75):
       - Change `{modelDisplay}` to `{paddedModel}`

       For SELECTED rows (line 118):
       - Change `{modelDisplay}` to `{paddedModel}`

       For NORMAL rows (line 164):
       - Change `{modelDisplay}` to `{paddedModel}`

    This ensures exactly 7 characters are always rendered for the model name, regardless of actual model (opus=4, haiku=5, sonnet=6, unknown=7).
  </action>
  <verify>
    Run TypeScript check: `npm run build` or `npx tsc --noEmit`
    Manual verification: Run the HUD with `npm start` and observe that context bars align across rows with different model names.
  </verify>
  <done>
    All session rows have subagent columns and context meters starting at the same column position regardless of model name. Model names are right-padded to 7 characters.
  </done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors
- Visual inspection confirms context meters align vertically across rows with different models
- Model names still display correctly (opus, haiku, sonnet, or unknown)
</verification>

<success_criteria>
- Context bars align across all rows regardless of model name length
- No visual regression in model display (still dimmed in normal rows)
- Build passes without errors
</success_criteria>

<output>
After completion, respond with changes made and verification results.
</output>
