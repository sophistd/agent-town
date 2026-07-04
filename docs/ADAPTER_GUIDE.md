# Adapter Guide

Adapters are the only place where external source shapes may enter Agent Town.
They translate source data into canonical `AgentEvent` objects, then the
existing reducer reconstructs `WorldState` for Town, Timeline, Detail, Graph,
and Memory projections.

```text
External source -> Adapter -> AgentEvent -> WorldState -> Projection views
```

Renderer and UI code must not branch on adapter-specific source schemas.

## Interface

```ts
interface AgentEventAdapter<Input> {
  source: AgentEventSource;
  parse(input: Input): AdapterResult | Promise<AdapterResult>;
}
```

`AdapterResult` contains:

- `events`: valid canonical `AgentEvent` objects.
- `warnings`: non-fatal adapter findings, such as invalid timestamps where
  replay can still use `sequence`.
- `quarantinedEvents`: invalid input lines/events that must not enter replay.
- `source`: the adapter source name.

## JSONL Native Adapter

`src/adapters/jsonlAdapter.ts` implements the S12 native JSONL path.

Rules:

- One non-empty line equals one JSON value.
- Each JSON value must already be a canonical `AgentEvent`.
- Missing required fields are quarantined.
- Missing `id` is quarantined; the adapter does not invent stable IDs.
- Duplicate event IDs are quarantined.
- Duplicate `(runId, sequence)` pairs are quarantined.
- Existing canonical `metadata.source` values are preserved.
- Missing `metadata.source` is set to `jsonl`.
- Invalid timestamps produce a warning, but the event remains playable because
  deterministic replay uses `sequence`.

## WebSocket Adapter

`src/adapters/websocketAdapter.ts` implements the S13 WebSocket path.

Rules:

- Each WebSocket message must be JSON or an already parsed object.
- Native `AgentEvent` messages are validated directly.
- Envelope messages may use `event`, `payload`, or `data` to carry the event.
- Source-shaped messages may be normalized before validation.
- Missing required fields are quarantined.
- Existing canonical `metadata.source` values are preserved.
- Missing `metadata.source` is set to `websocket`.
- `metadata.transport` is set to `websocket`.
- Invalid timestamps produce a warning, but the event remains playable because
  deterministic replay uses `sequence`.

## Mapping Table

For native JSONL, source fields map directly:

```text
source.id                  -> AgentEvent.id
source.runId               -> AgentEvent.runId
source.taskId              -> AgentEvent.taskId
source.parentEventId       -> AgentEvent.parentEventId
source.timestamp           -> AgentEvent.timestamp
source.sequence            -> AgentEvent.sequence
source.agentId             -> AgentEvent.agentId
source.agentName           -> AgentEvent.agentName
source.agentRole           -> AgentEvent.agentRole
source.type                -> AgentEvent.type
source.content             -> AgentEvent.content
source.summary             -> AgentEvent.summary
source.targetAgentId       -> AgentEvent.targetAgentId
source.targetTaskId        -> AgentEvent.targetTaskId
source.toolName            -> AgentEvent.toolName
source.toolInput           -> AgentEvent.toolInput
source.toolOutputSummary   -> AgentEvent.toolOutputSummary
source.artifactIds         -> AgentEvent.artifactIds
source.filePath            -> AgentEvent.filePath
source.locationHint        -> AgentEvent.locationHint
source.status              -> AgentEvent.status
source.metrics             -> AgentEvent.metrics
source.metadata            -> AgentEvent.metadata
```

For WebSocket source-shaped events, the adapter supports this initial mapping:

```text
source.id                  -> AgentEvent.id
source.eventId             -> AgentEvent.id
source.runId               -> AgentEvent.runId
source.run_id              -> AgentEvent.runId
source.taskId              -> AgentEvent.taskId
source.task_id             -> AgentEvent.taskId
source.parentEventId       -> AgentEvent.parentEventId
source.parent_event_id     -> AgentEvent.parentEventId
source.timestamp           -> AgentEvent.timestamp
source.time                -> AgentEvent.timestamp
source.createdAt           -> AgentEvent.timestamp
source.sequence            -> AgentEvent.sequence
source.seq                 -> AgentEvent.sequence
source.agent.id            -> AgentEvent.agentId
source.agent.name          -> AgentEvent.agentName
source.agent.role          -> AgentEvent.agentRole
source.agentId             -> AgentEvent.agentId
source.agentName           -> AgentEvent.agentName
source.agentRole           -> AgentEvent.agentRole
source.eventType           -> AgentEvent.type
source.event_type          -> AgentEvent.type
source.type                -> AgentEvent.type
source.content             -> AgentEvent.content
source.message             -> AgentEvent.content
source.text                -> AgentEvent.content
source.summary             -> AgentEvent.summary
source.name                -> AgentEvent.summary
source.targetAgentId       -> AgentEvent.targetAgentId
source.target_agent_id     -> AgentEvent.targetAgentId
source.targetTaskId        -> AgentEvent.targetTaskId
source.target_task_id      -> AgentEvent.targetTaskId
source.tool.name           -> AgentEvent.toolName
source.tool.input          -> AgentEvent.toolInput
source.tool.outputSummary  -> AgentEvent.toolOutputSummary
source.tool.output         -> AgentEvent.toolOutputSummary
source.metrics             -> AgentEvent.metrics
source.metadata            -> AgentEvent.metadata
```

For non-native sources, add a new adapter file and document a source-specific
mapping table before sending data to the reducer. Do not add source-specific
branches to `src/game/*` or projection components.

## Local WebSocket Procedure

A local runtime can send newline-free JSON messages to:

```plain text
ws://localhost:8765/events
```

Each message should be either a canonical `AgentEvent` or a source-shaped event
covered by the WebSocket mapping table above. The app's Import Source panel can
connect to that URL, and every accepted message is appended to the current
WebSocket run before replay.

## Adding Another Source

1. Create `src/adapters/<source>Adapter.ts`.
2. Parse the external input into candidate event objects.
3. Map external fields into canonical `AgentEvent` fields.
4. Preserve source metadata under `metadata`.
5. Validate every mapped event with `validateAgentEvent`.
6. Quarantine invalid candidates instead of throwing.
7. Document duplicate ID and duplicate sequence policy.
8. Add adapter tests that prove replay, metadata, and quarantine behavior.
9. Record evidence under `docs/evidence/M4/`.

## Boundary Checklist

- Adapter output is canonical `AgentEvent`.
- Reducer input remains `AgentEvent[]`.
- Renderer consumes only `WorldState`.
- Invalid input does not crash playback.
- A bad line/event cannot block later valid events.
