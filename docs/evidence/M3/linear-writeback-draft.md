# M3 Linear Writeback Draft

## Status

Not posted to Linear.

Current Codex app connectors for Notion and Linear return:

```text
HTTP 401 token_invalidated
Your authentication token has been invalidated. Please try signing in again.
```

Local MCP OAuth login for `linear` and `notion` succeeded, but the current
`codex_apps` tool session still uses the invalidated app connector token.

## MDL-141 Draft Comment

```markdown
S11 local implementation is complete.

Scope truth:
- Local-only branch: `mdl-141-detail-summary-shortcuts`
- Local commit: `ff8bb80` (`Implement S11 detail summary shortcuts`)
- No remote push or PR in this local-only repo.

Implemented:
- Added `RunSummary` with full-run counts for events, agents, handoffs, tool calls, memory actions, blocked events, and errors.
- Added first blocked, first error, and before-error shortcuts.
- Expanded `DetailPanel` to expose selected event fields: id, sequence, timestamp, runId, taskId, agent, role, type, status, content, target, tool, artifacts, file path, metrics, metadata, and raw JSON.
- Switched the default demo run to `mockFailureRun` so S11 failure shortcuts are inspectable from the app without adapters or invented data.
- Preserved the invariant that AgentEvent remains the source of truth; Town, Timeline, Detail, and Summary are projections.

Evidence:
- `docs/evidence/M3/debuggability-checklist.md`
- `docs/evidence/M3/failure-jump.md`
- `docs/evidence/M3/failure-jump.png`
- `docs/evidence/M3/detail-panel.png`

Verification:
- `pnpm typecheck`
- `pnpm test` (5 files / 20 tests)
- `pnpm build` (passed with existing Phaser chunk-size warning)
- Chrome CDP verification:
  - canvas count: 1
  - Timeline visible: true
  - `First error` jumps to `failure-008`
  - current and selected event both become `failure-008`
  - Detail content contains `Ordering check finds two events with sequence 12.`
  - `Before error` jumps to `failure-007`
  - Detail tool input contains `{"command":"pnpm test -- ordering"}`

Boundary checks:
- No adapter/jsonl/websocket/fetch/localStorage/sessionStorage introduced in the S11 touch set.
- No React/DOM/Phaser imports or browser globals introduced under `src/events`.
```

## MDL-127 M3 Gate Draft Comment

```markdown
M3 local acceptance evidence is complete for Timeline, trace, replay debugger, detail, and failure-jump workflows.

Scope truth:
- Local-only repo state.
- S10 commit: `b6f5ef6` (`Implement S10 playback timeline controls`)
- S11 commit: `ff8bb80` (`Implement S11 detail summary shortcuts`)
- No remote push or PR.

Acceptance evidence:
- Timeline can list events, move prev/next, play/pause, and jump by event.
- Replay derives WorldState from AgentEvent and playback cursor.
- Detail view shows full selected event data and raw JSON.
- Run Summary shows full-run counts and failure shortcuts.
- First error is reachable in 1 click from summary.
- Previous context before the first error is reachable in 2 clicks.
- Current playback event, selected event, and selected agent are visually distinguishable.
- Dense bubble text remains truncated in Town View while full content is visible in DetailPanel.

Evidence files:
- `docs/evidence/M3/timeline-controls.md`
- `docs/evidence/M3/timeline-controls.png`
- `docs/evidence/M3/replay-test-output.md`
- `docs/evidence/M3/debuggability-checklist.md`
- `docs/evidence/M3/failure-jump.md`
- `docs/evidence/M3/failure-jump.png`
- `docs/evidence/M3/detail-panel.png`

Verification:
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Browser/CDP evidence for timeline controls and failure shortcuts.

Known warning:
- Production build still reports the existing Phaser chunk-size warning; no new code-splitting work was in M3 scope.
```

## MDL-149 Red-Check Draft Comment

```markdown
M3 red-check passed locally.

Adversarial checks:
- AgentEvent remains the source of truth.
- React owns playback/selection state, not runtime facts.
- Phaser renders WorldState only and does not own source facts.
- Detail and Summary are selectors/projections over AgentEvent-derived state.
- Failure shortcuts do not invent data; they use existing `mockFailureRun` events.
- No adapters, external ingest, localStorage/sessionStorage, fetch, jsonl, or websocket paths were introduced.
- Event layer remains free of React/DOM/Phaser/browser globals.

Evidence:
- `docs/evidence/M3/debuggability-checklist.md`
- `docs/evidence/M3/failure-jump.md`
- `docs/evidence/M3/failure-jump.png`
- `docs/evidence/M3/detail-panel.png`

Commands:
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Boundary scans:
  - `rg -n "jsonl|websocket|adapter|fetch\\(|localStorage|sessionStorage" src/ui/RunSummary.tsx src/ui/DetailPanel.tsx src/ui/App.tsx src/ui/Layout.tsx src/events/selectors.ts src/state/selectionStore.ts`
  - `rg -n "from ['\\\"](react|react-dom|phaser)|document\\.|window\\.|HTMLElement|HTMLCanvasElement|CanvasRenderingContext2D" src/events`

Result:
- Both boundary scans returned no matches.
- Build passed with the existing Phaser chunk-size warning.
```

## Resume Instruction

After Notion and Linear app connector auth is restored:

1. Fetch the Session Runbook Index again.
2. Confirm MDL-141, MDL-127, and MDL-149 current external states.
3. Post the relevant comments above only if they are still accurate.
4. Move the corresponding Linear issues to Done only after read-back confirms the external state and no newer acceptance text contradicts this local evidence.
5. Continue by selecting the first still-uncompleted session from S00-S15.
