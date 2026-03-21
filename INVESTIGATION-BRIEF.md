# Investigation Brief
## Issue: SYMPH-52 — Fix GraphQL type in resolve_all_states

## Objective
Change `$teamId: String!` to `$teamId: ID!` in the `resolve_all_states()` function's GraphQL query in `~/.claude/skills/spec-gen/scripts/freeze-and-queue.sh`. This ensures the Linear API receives the correct scalar type for team IDs and eliminates HTTP 400 errors when resolving workflow state IDs. **The fix is already applied in the current file** — the implementation stage only needs to run the dry-run verification.

## Relevant Files (ranked by importance)
1. `~/.claude/skills/spec-gen/scripts/freeze-and-queue.sh` — The only file in scope. 991-line bash script that creates Linear issue hierarchies from spec files. The `resolve_all_states()` function is at lines 257–267.

## Key Code Patterns
- All Linear API calls use `linear-cli api query -o json --quiet --compact` with `-v "key=value"` for simple scalar parameters.
- Query on line 262 (not 261 as the issue states — off-by-one): `'query($teamId: ID!) { workflowStates(filter: { team: { id: { eq: $teamId } } }) { nodes { id name } } }'`
- Line 229 (`resolve_team_from_project`) uses `$slug: String!` — this is correct and must NOT be changed.

## Architecture Context
- `freeze-and-queue.sh` is a standalone bash script invoked by `spec-gen` skills.
- `resolve_all_states()` is called early in the script to batch-resolve Draft, TODO, and Backlog state IDs for the team.
- The fix matters because Linear's GraphQL schema types team IDs as `ID!` (not `String!`), causing HTTP 400 validation errors when `String!` is used.
- Data flow: `TEAM_ID` global → `-v "teamId=$TEAM_ID"` → `workflowStates` query → `DRAFT_STATE_ID`, `TODO_STATE_ID`, `BACKLOG_STATE_ID` globals.

## Test Strategy
- **Verification command** (from issue spec):
  ```bash
  bash ~/.claude/skills/spec-gen/scripts/freeze-and-queue.sh \
    --dry-run --parent-only \
    /Users/ericlitman/intent/workspaces/architecture-build/repo/symphony-ts/pipeline-config/workflows/WORKFLOW-symphony.md \
    < /tmp/spec-freeze-queue-fixes.md 2>&1 | grep -q "Found .* tasks"
  ```
- The `--dry-run` flag suppresses actual API mutations; state ID resolution still runs (API read calls are not suppressed in dry-run mode — check the script logic to confirm).
- Check that Draft, Todo, and Backlog state IDs are resolved (non-empty) in the output.

## Gotchas & Constraints
- **Do NOT change line 229** (`$slug: String!` in `resolve_team_from_project`) — that type is correct.
- **Do NOT change any GraphQL mutations** — only the `resolve_all_states` query is in scope.
- **Do NOT touch the trivial issue creation flow**.
- The fix is already applied: line 262 currently reads `$teamId: ID!`. Confirm this before spending time "applying" the fix.
- Note off-by-one: issue says "line 261" but the GraphQL string is on line 262; line 261 is the `-v "teamId=$TEAM_ID" \` continuation.

## Key Code Excerpts

**resolve_all_states() function** (lines 257–267) — current state with fix already applied:
```bash
resolve_all_states() {
  # Single workflowStates GraphQL query to batch-resolve all needed state IDs
  local states_json
  states_json=$($LINEAR_CLI api query -o json --quiet --compact \
    -v "teamId=$TEAM_ID" \
    'query($teamId: ID!) { workflowStates(filter: { team: { id: { eq: $teamId } } }) { nodes { id name } } }' 2>/dev/null)

  DRAFT_STATE_ID=$(echo "$states_json" | jq -r '.data.workflowStates.nodes[] | select(.name == "Draft") | .id' | head -1)
  TODO_STATE_ID=$(echo "$states_json" | jq -r '.data.workflowStates.nodes[] | select(.name == "Todo") | .id' | head -1)
  BACKLOG_STATE_ID=$(echo "$states_json" | jq -r '.data.workflowStates.nodes[] | select(.name == "Backlog") | .id' | head -1)
}
```

**resolve_team_from_project() function** (lines 225–230) — String! is correct here, do not modify:
```bash
project_json=$($LINEAR_CLI api query -o json --quiet --compact \
  -v "slug=$PROJECT_SLUG" \
  'query($slug: String!) { projects(filter: { slugId: { eq: $slug } }) { nodes { id teams { nodes { id key } } } } }' 2>/dev/null)
```
