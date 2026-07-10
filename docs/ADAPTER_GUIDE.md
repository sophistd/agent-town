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

## LLM Planner Contract Adapter

`src/adapters/llmPlannerAdapter.ts` implements the current LLM planner contract
path.

Rules:

- The request builder summarizes prior canonical events and durable memory
  records into a model-ready JSON contract.
- The request builder retrieves memory per agent by relevance, importance,
  recency, and agent affinity instead of passing only a global memory list.
- The parser accepts either an object or JSON string response.
- Each response step must map to one canonical `AgentEvent`.
- Missing required event fields are quarantined.
- `message` and `handoff` steps without `targetAgentId` are quarantined.
- `tool_call` steps without `toolName` are quarantined.
- Duplicate event IDs and duplicate `(runId, sequence)` pairs are quarantined.
- Accepted events receive `metadata.source = "llm"` and
  `metadata.llmPlanner` with request id, prompt hash, model role, model name,
  response step id, prior-run context, selected memory record IDs, selected
  memory source event IDs, and agent-addressable retrieval counts.
- Accepted events also receive `metadata.agentAddressableMemory` with selected
  memory records, retrieval scores, per-agent retrieval snapshots, source event
  IDs, selected-for agent IDs, and retrieval weights.
- `buildOpenAiResponsesPlannerBody` builds an OpenAI Responses request with
  `store: false`, JSON schema output formatting, developer/user messages,
  planner metadata, and the same agent-addressable memory retrieval evidence.
- `callOpenAiLlmPlanner` is the provider-backed boundary. It requires an API
  key supplied by the local runtime, calls the Responses API through injected or
  runtime `fetch`, extracts `output_text`, then sends the model text through the
  same parser, validation, and quarantine path.
- The current UI source still uses a deterministic model-shaped fixture
  response. Browser code does not receive API keys and does not call the live
  provider.
- Tests use an injected mock `fetch` to prove provider request construction and
  provider output parsing. A live provider call requires `OPENAI_API_KEY` in the
  local runtime.

## Adaptive Routine Adapter

`src/adapters/adaptiveRoutineAdapter.ts` implements the current adaptive daily
plan path.

Rules:

- The adapter reads prior canonical routine events and external town
  observations.
- If the supplied stream has no `metadata.routine` evidence, it returns a
  warning and uses the deterministic Routine day seed so the UI source remains
  runnable without silently claiming current-run provenance.
- It emits revised observation, memory retrieval, reflection, planning, action,
  and memory writeback events for up to 25 agents.
- Accepted events use `metadata.source = "custom"` and carry
  `metadata.routine`, `metadata.routineRevision`, `metadata.cognitiveStage`,
  `metadata.subLocationId`, and `metadata.activity`.
- `metadata.routineRevision` records the previous run id, previous event id,
  prior routine event ids, selected memory event ids, previous location,
  revised location, source observation, reason, schema version, and generator
  boundary.
- The adapter validates generated events before replay and quarantines invalid
  generated events instead of letting them enter `WorldState`.
- Phaser, map objects, sprites, and React state do not revise schedules. They
  only project the accepted `AgentEvent -> WorldState` result.

## File-Backed Persistent Memory Store

`src/state/filePersistentMemoryStore.ts` extends persistent memory beyond the
browser-only storage boundary for local or server-side runtimes.

Rules:

- It uses the same `PersistentMemoryRecord` and versioned snapshot schema as
  `src/state/persistentMemoryStore.ts`.
- It writes snapshots to a caller-provided file path with an atomic temporary
  file plus rename.
- It can merge incoming canonical memory records into the file-backed snapshot
  through `mergePersistentMemoryRecords`.
- Missing, unreadable, invalid, or unwritable files return explicit adapter
  warnings; they are not treated as silent success.
- File-backed memory remains an adapter/backing-store boundary. The renderer
  still receives only canonical `AgentEvent[]` replayed into `WorldState`.

`src/adapters/worldMemoryRuntime.ts` is the local/server runtime API over that
store.

Rules:

- `ingestEventsIntoFileWorldMemory` validates incoming event-shaped input,
  quarantines invalid events, extracts only canonical `memory_read` /
  `memory_write` records, and merges them into the file-backed store.
- `buildFileWorldMemoryRecallResult` loads records from the file-backed store
  and emits canonical recall events through the existing memory adapter path.
- `buildFileWorldMemoryPlanResult` loads records from the file-backed store and
  emits agent-addressable retrieval, reflection, and planning events.
- Non-memory event streams produce an explicit
  `world_memory_ingest_no_memory_events` warning instead of fabricating durable
  memory.
- This API is not a long-running server process by itself. It is the boundary a
  local/server runtime can call without giving files or the renderer ownership
  of world facts.

`src/server/worldMemoryHttpServer.ts` exposes that runtime as a long-running
local/server HTTP process. `pnpm world-memory:server` starts it through the
existing Vite toolchain without adding a new runtime dependency.

Routes:

- `GET /health`
- `POST /memory/ingest`
- `GET /memory/recall`
- `POST /memory/plan`

Rules:

- The server requires `AGENT_TOWN_WORLD_MEMORY_FILE` or a file path argument so
  the durable memory location is explicit.
- The default bind host is `127.0.0.1`; callers may override host or port for a
  local/server deployment.
- `/memory/ingest` accepts event-shaped JSON, validates it through the canonical
  event validator, quarantines invalid events, and persists only canonical
  memory events.
- `/memory/plan` also validates `previousEvents` before using them as planning
  context. Invalid context events are quarantined as
  `invalid_world_memory_plan_context_event`.
- `/memory/recall` and `/memory/plan` return adapter-shaped canonical event
  output. Callers still have to replay those events into `WorldState`; the HTTP
  process does not own projection facts.
- Malformed JSON and oversized request bodies return explicit JSON errors
  instead of being silently accepted.

`src/adapters/worldMemoryProviderLoop.ts` connects the long-running
world-memory process to the existing provider planner boundary.

Loop order:

1. Validate the external event stream locally for planner context.
2. Send the raw event-shaped stream to `/memory/ingest` so the server persists
   only canonical memory evidence.
3. Call `/memory/recall` and reconstruct provider request records from the
   canonical recall events, including `metadata.durableMemory`.
4. Call `/memory/plan` to get server-backed agent-addressable memory context as
   canonical events.
5. Build `buildSmallvilleLlmPlannerRequest` from accepted input events, server
   Memory plan events, and reconstructed durable records.
6. Call `callOpenAiLlmPlanner`, preserving the existing API-key, fetch,
   provider-response parsing, and quarantine behavior.

Rules:

- The loop does not read the memory file directly.
- The loop does not accept server state as `WorldState`.
- Missing API keys produce the existing `missing_openai_api_key` warning and do
  not call the provider.
- Invalid input events are quarantined as
  `invalid_world_memory_provider_loop_input_event`.
- Provider output still has to pass through `parseLlmPlannerResponse` and
  canonical event validation before replay.

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
