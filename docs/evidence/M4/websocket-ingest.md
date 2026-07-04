# S13 WebSocket Ingest Evidence

Session: S13 - WebSocket ingest and source switcher
Date: 2026-07-04
Reviewer: Codex

## Sources Checked

- Notion S13 session runbook: WebSocket ingest and source switcher
- Notion M4 spec: runtime adapters/local ingest
- Notion metrics: M4 adapter quality and source independence
- Linear MDL-143: implementation issue
- Linear MDL-128: M4 acceptance gate
- Linear MDL-150: M4 red-check
- `docs/ADAPTER_GUIDE.md` from S12

## Files

- `src/adapters/websocketAdapter.ts`
- `src/ui/ImportPanel.tsx`
- `src/ui/App.tsx`
- `src/tests/adapters.test.ts`
- `docs/ADAPTER_GUIDE.md`
- `docs/evidence/M4/websocket-ingest.md`
- `docs/evidence/M4/source-switcher.png`

Scope note:

- S13's allowed file list did not explicitly name `src/ui/App.tsx`, but a
  mounted source switcher must pass the selected `AgentEvent[]` into the
  existing replay path. The `App.tsx` change is limited to that wiring.

## WebSocket Adapter

Adapter:

```plain text
src/adapters/websocketAdapter.ts
```

Accepted input:

- JSON string messages
- already parsed objects
- native `AgentEvent` messages
- envelope messages with `event`, `payload`, or `data`
- source-shaped messages that can be normalized before validation

Behavior:

- Valid messages produce canonical `AgentEvent[]`.
- Invalid JSON is quarantined.
- Invalid normalized events are quarantined.
- Duplicate event IDs and duplicate `(runId, sequence)` pairs in a batch are
  quarantined.
- Missing `metadata.source` becomes `websocket`.
- Existing canonical `metadata.source` is preserved.
- `metadata.transport` is set to `websocket`.
- Invalid timestamps warn but remain replayable by sequence.

Live path:

```plain text
connectWebSocketIngest({ url, onResult, onStatus })
```

Every WebSocket message is parsed through `parseWebSocketMessages`, then the app
appends accepted events to the current WebSocket run before replay.

## Source Switcher

UI:

```plain text
src/ui/ImportPanel.tsx
```

Sources:

- `Mock`: restores the existing failure-run fixture.
- `JSONL`: imports the editable JSONL textarea through `parseNativeJsonl`.
- `WS sample`: imports two WebSocket messages through `parseWebSocketMessages`.
- `Connect`: opens the configured WebSocket URL and routes received messages
  through `connectWebSocketIngest`.

The switcher does not fork renderer state. `App.tsx` keeps the current
`AgentEvent[]`, then Town, Timeline, Detail, and Run Summary continue to use
the same reducer/projection path.

## Browser QA

Flow under test:

```plain text
app loads -> source switcher changes source -> Timeline/Detail reflect imported events -> failed WebSocket connect shows a visible non-crashing error
```

Environment:

- URL: `http://127.0.0.1:5173/`
- Browser path: in-app Browser plugin
- Browser note: `domSnapshot()` hit a plugin-side capability error, so QA used
  read-only page evaluation plus screenshot in the same in-app Browser. No
  external Chrome/Playwright fallback was used.

Checks:

```plain text
Page identity: Agent Town at http://127.0.0.1:5173/
Not blank: Import Source, Timeline, Run Summary, and canvas present
Framework overlay: none observed
Initial console health: no error/warn logs
Canvas count: 1
Screenshot: docs/evidence/M4/source-switcher.png
```

Interaction proof:

```plain text
Initial state:
- active source: mock
- status: Mock failure run loaded
- events: 30

Click JSONL:
- status: JSONL import: 3 events accepted
- active source: jsonl
- JSONL event id visible: jsonl-ui-0
- warnings: 0
- quarantined: 0

Click WS sample:
- status: WebSocket sample: 2 events accepted
- active source: websocket
- current event: ws-native-000
- run summary events: 2
- tool call count: 1

Click the second WebSocket timeline event:
- current event: ws-source-001
- selected event: ws-source-001
- tool name visible: websocket_ingest
- trace metadata visible: trace-websocket-sample
- metadata.source visible: websocket

Click Connect with no local server running:
- status role: alert
- status: Connection error for ws://localhost:8765/events; connection closed
- app shell still visible
- canvas count remains 1
- Timeline remains visible
- console health after failed connect: no error/warn logs
```

Screenshot:

```plain text
docs/evidence/M4/source-switcher.png
```

## Mock WebSocket Procedure

A local runtime can send WebSocket messages to:

```plain text
ws://localhost:8765/events
```

Message shape:

```json
{
  "id": "evt-live-001",
  "runId": "run-live",
  "taskId": "task-live",
  "timestamp": "2026-07-04T13:00:00.000Z",
  "sequence": 0,
  "agentId": "agent-planner",
  "agentName": "Planner",
  "agentRole": "planner",
  "type": "thinking",
  "content": "Planner receives a live message."
}
```

Or source-shaped:

```json
{
  "id": "evt-live-002",
  "runId": "run-live",
  "taskId": "task-live",
  "timestamp": "2026-07-04T13:00:01.000Z",
  "sequence": 1,
  "agent": { "id": "agent-coder", "name": "Coder", "role": "coder" },
  "eventType": "tool_call",
  "message": "Coder reads a live message.",
  "tool": { "name": "websocket_ingest", "outputSummary": "ok" }
}
```

## Tests

`src/tests/adapters.test.ts` covers:

- JSONL native import still works.
- JSONL invalid input quarantine still works.
- WebSocket native `AgentEvent` message import.
- WebSocket source-shaped event normalization.
- WebSocket invalid JSON, invalid event, duplicate ID, and duplicate sequence
  quarantine.
- Fake socket route through `connectWebSocketIngest`.

## Commands

```plain text
pnpm typecheck
```

Result:

```plain text
passed
```

```plain text
pnpm test
```

Result:

```plain text
Test Files  6 passed (6)
Tests       29 passed (29)
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

## Boundary Scans

Renderer source/vendor scan:

```plain text
rg -n "jsonl|websocket|langfuse|opentelemetry|claude_code|codex|source" src/game || true
```

Result:

```plain text
no matches
```

Projection component source/vendor scan:

```plain text
rg -n "jsonl|websocket|langfuse|opentelemetry|claude_code|codex" src/ui/TownCanvas.tsx src/ui/Timeline.tsx src/ui/DetailPanel.tsx src/ui/RunSummary.tsx || true
```

Result:

```plain text
no matches
```

Event/adapter browser dependency scan:

```plain text
rg -n "from ['\"](react|react-dom|phaser)|document\.|window\.|HTMLElement|HTMLCanvasElement|CanvasRenderingContext2D" src/events src/adapters || true
```

Result:

```plain text
no matches
```

Conclusion:

- Source switching is isolated to `App.tsx` and `ImportPanel.tsx`.
- Renderer/projection components do not branch by source type.
- Adapters produce canonical `AgentEvent[]` plus warnings/quarantine metadata.
- Reducer and renderer continue to consume `AgentEvent`/`WorldState`.

## M4 Gate Self-Check

- [x] WebSocket ingest accepts AgentEvent-shaped messages.
- [x] WebSocket ingest accepts normalizable source-shaped messages.
- [x] JSONL ingest still accepts one event per line and can replay.
- [x] Adapter boundary is explicit.
- [x] Adapter mapping table documents source to AgentEvent mapping.
- [x] Invalid events are quarantined with error metadata.
- [x] Source metadata is preserved.
- [x] Stable event IDs are preserved.
- [x] Metrics can pass through as optional fields.
- [x] User can switch mock, JSONL imported, and WebSocket sample sources.
- [x] Imported/WebSocket runs appear in Town, Timeline, and Detail without
  renderer source branches.

## Limitations

- No production vendor integration was added.
- No local WebSocket server script was committed; the app supports connecting to
  a local server, and the adapter has fake-socket unit coverage.
- `src/ui/App.tsx` was touched as the smallest necessary source-switcher wiring
  surface even though the S13 runbook did not explicitly list it.
