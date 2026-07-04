# S12 JSONL Import Evidence

Session: S12 - JSONL adapter and quarantine path
Date: 2026-07-04
Reviewer: Codex

## Sources Checked

- Notion S12 session runbook: JSONL adapter and quarantine path
- Notion M4 spec: runtime adapters/local ingest
- Notion M4 metrics: adapter quality and source independence
- Linear MDL-142: implementation issue
- Linear MDL-128 and MDL-150: M4 gate and red-check context

## Files

- `src/adapters/types.ts`
- `src/adapters/jsonlAdapter.ts`
- `src/tests/adapters.test.ts`
- `docs/ADAPTER_GUIDE.md`
- `docs/samples/sample-native.jsonl`
- `docs/evidence/M4/jsonl-import.md`

## Sample JSONL Run

Sample file:

```plain text
docs/samples/sample-native.jsonl
```

Line count:

```plain text
25 docs/samples/sample-native.jsonl
```

Stable event ID check:

```plain text
first event: happy-000
last event:  happy-024
```

Sample import behavior is covered by `src/tests/adapters.test.ts`:

- parsed events: 25
- quarantined events: 0
- final replay `runSummary.totalEvents`: 25
- repeated replay of the imported event list reconstructs the same `WorldState`

## Quarantine Example

The adapter test feeds:

```plain text
line 1: invalid JSON
line 2: event missing id
line 3: valid event jsonl-000 sequence 0
line 4: duplicate id jsonl-000
line 5: duplicate runId/sequence pair
```

Expected result:

```plain text
accepted events: 1
quarantine codes:
- invalid_json
- invalid_agent_event
- duplicate_agent_event
- duplicate_agent_event
quarantine lines: 1, 2, 4, 5
```

Policy:

- Missing IDs are quarantined; the adapter does not invent stable IDs.
- Duplicate event IDs are quarantined.
- Duplicate `(runId, sequence)` pairs are quarantined.
- Invalid JSON is quarantined with line and raw input metadata.
- Later valid events are not blocked by earlier invalid lines.

## Warning Example

Invalid timestamps are non-fatal when the event is otherwise a valid
`AgentEvent`.

```plain text
warning code: invalid_timestamp
event remains replayable because reducer playback uses sequence order
```

## Source Metadata

Policy:

- Existing canonical `metadata.source` values are preserved.
- Missing `metadata.source` is set to `jsonl`.
- `metadata.rawEventId` is preserved when present.

Coverage:

- Unit test preserves a `codex` source value on import.
- Sample events carry `metadata.source: "jsonl"` and `metadata.rawEventId`.

## Renderer Source Independence

Command:

```plain text
rg -n "['\"](jsonl|websocket|langfuse|opentelemetry|claude_code|codex|cursor|custom)['\"]" src/game src/ui || true
```

Result:

```plain text
no matches
```

Boundary command:

```plain text
rg -n "from ['\"](react|react-dom|phaser)|document\.|window\.|HTMLElement|HTMLCanvasElement|CanvasRenderingContext2D" src/events src/adapters || true
```

Result:

```plain text
no matches
```

Conclusion:

- Adapter output is canonical `AgentEvent[]` plus warnings/quarantine metadata.
- Existing reducer replay consumes imported events without renderer branching.
- No source-specific branches were added to `src/game/*` or `src/ui/*`.
- No React, DOM, Phaser, or browser globals were introduced in `src/events/*`
  or `src/adapters/*`.

## Commands

```plain text
pnpm typecheck
```

Result:

```plain text
passed
```

```plain text
pnpm test -- src/tests/adapters.test.ts src/tests/validators.test.ts
```

Result:

```plain text
Test Files  6 passed (6)
Tests       25 passed (25)
```

```plain text
pnpm test
```

Result:

```plain text
Test Files  6 passed (6)
Tests       25 passed (25)
```

```plain text
pnpm build
```

Result:

```plain text
passed
```

Known warning:

```plain text
Some chunks are larger than 500 kB after minification.
```

The warning is the existing Phaser bundle-size warning and is not an adapter
regression.

## Acceptance Self-Check

- [x] `AgentEventAdapter<Input>` exists.
- [x] JSONL native `AgentEvent` import works.
- [x] One line/event parses into stable objects.
- [x] Invalid events are quarantined with error metadata.
- [x] Duplicate and missing IDs are handled with documented policy.
- [x] Source metadata is preserved.
- [x] Imported run can replay through the existing reducer.
- [x] Renderer code does not branch by source type.
- [x] Adapter guide explains how to add another source.

## Scope Truth

S12 is complete locally. M4 is not complete yet:

- WebSocket ingest is still S13 scope.
- Source switching/UI import selection is still later M4 scope.
- MDL-128 and MDL-150 should remain open until the M4 gate and red-check are
  complete.
