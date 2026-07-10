# AgentEvent Schema

AgentEvent is the only source of truth in Agent Town. Town, Timeline, Detail,
Graph, and Memory views are projections derived from AgentEvent through
WorldState.

Code reference:

- `src/events/types.ts`
- `src/events/constants.ts`

Notion reference:

- M0 ontology spec: https://app.notion.com/p/393acb4bb6e6810fa5f6f219dad5159c
- M1 event engine spec: https://app.notion.com/p/393acb4bb6e681e0881cf97ba112d401

## Invariants

- AgentEvent owns runtime facts.
- WorldState is derived from AgentEvent.
- Renderers consume WorldState and may keep transient animation state only.
- Adapters produce AgentEvent and preserve raw source metadata.
- Event replay is sequence-based and deterministic.
- Metrics are optional; missing cost, latency, or token values must not block
  playback.

## AgentEventType

| Type | Meaning |
| --- | --- |
| `thinking` | agent is planning, judging, or reasoning |
| `message` | agent sends a natural-language message |
| `tool_call` | agent invokes a tool, command, search, or file action |
| `handoff` | agent transfers task, context, artifact, or responsibility |
| `memory_read` | agent reads memory or project context |
| `memory_write` | agent writes memory or project context |
| `decision` | planner or orchestrator chooses route, priority, or strategy |
| `blocked` | agent is waiting, missing context, or needs input |
| `error` | tool, test, parsing, or runtime failure |
| `done` | task, subtask, or run completes |

## AgentRole

Canonical roles are:

- `planner`
- `researcher`
- `coder`
- `reviewer`
- `memory`
- `critic`
- `orchestrator`
- `custom`

## AgentLocation

| Location | Meaning |
| --- | --- |
| `town_hall` | planning, orchestration, decisions |
| `library` | research, docs, search, reading |
| `workshop` | coding, build, artifact generation |
| `archive` | memory read, memory write, context update |
| `review_room` | critique, test, verify, review |
| `dispatch_board` | queue, assignment, waiting, blocked backlog |
| `square` | start, done, final summary |
| `unknown` | fallback when no stable route exists |

## Required AgentEvent Fields

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | stable event id |
| `runId` | `string` | run identity |
| `taskId` | `string` | task or subtask identity |
| `timestamp` | `string` | event timestamp |
| `sequence` | `number` | deterministic replay order |
| `agentId` | `string` | source agent id |
| `agentName` | `string` | source agent display name |
| `agentRole` | `AgentRole` | source agent role |
| `type` | `AgentEventType` | event vocabulary value |
| `content` | `string` | full event content |

## Optional AgentEvent Fields

| Field | Type | Meaning |
| --- | --- | --- |
| `parentEventId` | `string` | causal parent event |
| `summary` | `string` | compact display label |
| `targetAgentId` | `string` | message or handoff target agent |
| `targetTaskId` | `string` | task target |
| `toolName` | `string` | called tool name |
| `toolInput` | `unknown` | raw or normalized tool input |
| `toolOutputSummary` | `string` | compact tool output summary |
| `artifactIds` | `string[]` | related artifacts |
| `filePath` | `string` | related local file path |
| `locationHint` | `AgentLocation` | source-provided location hint |
| `status` | `AgentEventStatus` | event lifecycle status |
| `metrics` | `AgentEventMetrics` | optional latency, cost, token fields |
| `metadata` | `AgentEventMetadata` | source metadata and extension point |

## Supported Sources

`metadata.source` supports:

- `intervention`
- `memory`
- `llm`
- `mock`
- `jsonl`
- `websocket`
- `langfuse`
- `opentelemetry`
- `claude_code`
- `codex`
- `cursor`
- `custom`

Adapters may preserve source-specific details in `metadata` as `unknown`, but
renderer code must not branch on adapter-specific schemas.

## Cognitive Metadata

The deterministic Smallville-oriented runtime in `src/events/generativeRuntime.ts`
uses `metadata` to preserve cognition evidence without extending the canonical
event type vocabulary.

Common fields:

| Metadata field | Meaning |
| --- | --- |
| `cognitiveStage` | One of `observation`, `retrieval`, `reflection`, `planning`, `action`, `conversation`, `closure` |
| `subLocationId` | Projection anchor inside the stable `locationHint` zone |
| `activity` | Short activity label for expanded town rendering |
| `persona` | Seed persona used to generate the deterministic fixture event |
| `memoryId` | Memory record written by an observation, reflection, or plan event |
| `memoryKind` | `observation`, `reflection`, or `plan` |
| `retrievalQuery` | Query used by memory retrieval |
| `retrievedMemories` | Array of retrieved memory score records |
| `derivedFromMemoryIds` | Memory IDs synthesized into a reflection |
| `planStep` | Planned goal, next action, and expected projection target |
| `relationships` | Agent IDs used by deterministic social fixtures to expose relationship graph evidence |
| `intervention` | User-seeded social premise or natural-language operator prompt that became an `AgentEvent`, not renderer state |
| `socialDiffusion` | Object describing event id, invite wave, source agent, targets, knowledge, and attendance |
| `routine` | Deterministic daily routine segment with day id, phase, time window, stable location, sub-location, planned activity, and intention |
| `routineConflict` | Deterministic routine crowding record with conflict id, capacity, involved agents, shifted location, shifted sub-location, and resolution |
| `routineRevision` | Adaptive routine record with revision id, source observation, previous routine evidence, selected memory evidence, previous location, revised location, and generator boundary |
| `durableMemory` | Versioned record showing which persisted memory record was recalled into the current event stream |
| `agentAddressableMemory` | Agent-scoped persistent-memory query, selected records, scores, and retrieval weights used to create planning evidence |
| `llmPlanner` | Model-planner contract evidence showing request id, prompt hash, model role, response step id, selected memory record IDs, and prior-run context |

These fields are projection and inspection evidence. The renderer may display
them or use `subLocationId` / `activity` as projection hints, but it must not
invent them. If they are missing, replay still falls back to canonical
`AgentEvent` fields.

The deterministic `Social day` source uses these social metadata fields to
model a 25-agent Valentine's invitation diffusion chain. The metadata is not a
separate simulation state: it is evidence carried by canonical `AgentEvent`
records and replayed into `WorldState` like any other source.

The deterministic `Routine day` source uses `metadata.routine` to expose six
routine phases for each of 25 agents: wake, retrieve, work, plan, act, and
close. It uses `metadata.routineConflict` on blocked reflection events when a
work sub-location exceeds deterministic capacity and the agent shifts to a
stable fallback anchor. These records are schedule evidence carried by
canonical `AgentEvent` records; they are not Phaser map state, Tiled object
state, or autonomous scheduling claims.

The deterministic `Adaptive routine` source is adapter-produced rather than a
renderer behavior. It reads prior canonical routine evidence plus new town
observations, then emits revised observation, retrieval, reflection, planning,
action, and closure events with `metadata.routineRevision`. Each revision records
the previous run/event evidence, selected memory event IDs, the old projection
anchor, the revised projection anchor, and the deterministic adapter name. This
is stronger than a static routine fixture because schedule changes are
inspectable event evidence, but it is still not an autonomous free-running
Smallville simulation.

The deterministic `Intervention` adapter uses the same metadata path for a live
operator prompt. It records the raw prompt, inferred intent, prior run id,
prior event/memory counts, target location, and generator name under
`metadata.intervention`. That record is inspection evidence carried by the
event stream; the UI text area and Phaser renderer do not own the intervention
state.

The deterministic `Memory` source uses versioned browser storage as an adapter
boundary. The store saves only evidence extracted from canonical
`memory_read` / `memory_write` events. When recalled, those records become new
canonical `memory_read` events with `metadata.durableMemory`; localStorage is
not replayed directly and does not give the renderer runtime facts.
`src/state/filePersistentMemoryStore.ts` provides the same snapshot contract for
local/server-side file-backed world memory. Missing, unreadable, or invalid file
snapshots surface explicit warnings instead of silently becoming successful
memory loads. `src/adapters/worldMemoryRuntime.ts` connects that store to local
or server runtimes: incoming event-shaped input is validated first, invalid
events are quarantined, only canonical memory events are persisted, and recall
or plan output still re-enters replay as canonical `AgentEvent` evidence.
`src/server/worldMemoryHttpServer.ts` exposes the same boundary as a
long-running local/server HTTP process. Its routes do not define a new event
schema: `/memory/ingest` still accepts event-shaped input only after canonical
validation, `/memory/plan` validates prior-event context before use, and both
recall and plan responses remain adapter-shaped canonical event output.
`src/adapters/worldMemoryProviderLoop.ts` consumes that server boundary without
adding a new schema: it reconstructs provider request records from canonical
recall events, uses server Memory plan events as prior context, and still sends
provider output through `parseLlmPlannerResponse` before replay.
`src/server/worldMemoryProviderLoopRunner.ts` drives the same path from the
native JSONL event format, so external runtime sender files remain canonical
`AgentEvent` lines rather than a new provider-loop schema.
`POST /provider-loop` on the long-running world-memory server exposes the same
loop for live HTTP sender events. The route still accepts event-shaped input,
quarantines invalid candidates, rejects secrets in request bodies, and returns
canonical provider events rather than introducing an HTTP-owned event schema.
The Provider HTTP workbench source posts the current canonical event stream to
that route and validates returned recall, Memory plan, and provider events again
before replay; the browser source does not define a new event schema.
`pnpm smallville:runtime-stream` adds a deterministic external runtime stream
sender on the same schema: it emits canonical `AgentEvent` batches, marks them
with `metadata.source: "custom"` plus `metadata.externalRuntime`, and posts each
tick to `/provider-loop`. The external runtime annotation is provenance only;
the accepted facts still enter replay through `AgentEvent -> WorldState`.
`pnpm smallville:scheduler` adds a bounded world-clock scheduler on the same
schema: it cycles routine, cognitive, and social phases, marks emitted events
with `metadata.source: "custom"` plus `metadata.scheduler`, and posts each tick
to `/provider-loop`. Scheduler metadata records phase and virtual-clock
provenance only; it does not create a second event schema or bypass replay.
Scheduler checkpoints are control-plane state only. A checkpoint records the
next tick index, phase plan, tick shape, last completed tick summary, and memory
file path so a later process can resume emitting canonical events. The
checkpoint itself is not replayed into `WorldState` and does not define runtime
facts.
Scheduler elapsed-time supervision is also control-plane state only.
`AGENT_TOWN_SCHEDULER_MAX_ELAPSED_MS` can stop the runner after a completed
tick and a checkpoint write, but it does not create, delete, or reorder
canonical events. The summary records the stop reason under
`supervision.stopReason`; replay still reads only emitted `AgentEvent` batches.

The deterministic `Memory plan` source uses the same persistent records as an
agent-addressable memory stream. Each durable-memory agent receives a query
built from its stored memory evidence, enriched by current-run context when the
same agent is present; the adapter scores durable records by relevance,
importance, recency, and agent affinity, then emits canonical `memory_read`,
`thinking`, and `decision` events with `metadata.agentAddressableMemory`.
The browser store remains an adapter boundary, not a projection fact.

The deterministic `LLM plan` source defines the contract for future
provider-backed model behavior. It builds a model-ready JSON request from prior
events and agent-addressable durable-memory retrieval. Each request records
per-agent retrieval queries, candidate record IDs, selected record IDs, source
event IDs, retrieval scores, and retrieval weights before parsing a
model-shaped JSON response into canonical events with `metadata.llmPlanner` and
`metadata.agentAddressableMemory`. Invalid JSON, invalid step objects, duplicate
event IDs, duplicate `(runId, sequence)` pairs, missing message targets, and
missing tool names are quarantined before replay. The current UI button uses a
deterministic fixture response; it does not call a live LLM provider and does
not give the renderer model-owned runtime facts.

`llmPlannerAdapter.ts` also exposes an OpenAI Responses provider boundary for
local/server-side runtimes. `buildOpenAiResponsesPlannerBody` creates a
`store: false` JSON-schema request that includes the same agent-addressable
memory retrieval evidence, and `callOpenAiLlmPlanner` calls the provider through
injected/runtime `fetch`, extracts `output_text`, then reuses the same parser,
validation, and quarantine path. API keys must stay outside browser code; the
UI still uses the deterministic fixture.

## Smallville Evaluation

`src/events/smallvilleEvaluation.ts` computes a structural Smallville-oriented
report from canonical `AgentEvent[]` plus replayed `WorldState`.

The report includes:

- `isSmallvilleLike`
- overall structural score
- capability scores for identity, observation, retrieval, reflection, planning,
  action/conversation, social coordination, relationship graph, routine
  schedule, adaptive routine revision, persistent memory, and LLM contract
  evidence
- top missing or partial gaps
- ablation checks for observation, retrieval, reflection, planning,
  relationship graph, routine schedule, adaptive routine revision, and LLM
  planner contract
- event, agent, relationship, social, and routine evidence counts

This evaluator is a projection/inspection helper. It does not create
`AgentEvent` records, mutate `WorldState`, change replay semantics, or give
React/Phaser ownership of behavior. It is not a human believability study and
does not claim autonomous Stanford Smallville parity.

## WorldState

WorldState is the derived projection state:

- `runId`
- `cursor`
- `currentEventId`
- `selectedEventId`
- `selectedAgentId`
- `agents`
- `visibleBubbles`
- `edges`
- `relationships`
- `runSummary`
- `warnings`
- `quarantinedEvents`

## Relationship State

`WorldState.relationships` is derived during replay. It is not source input and
not renderer state.

The reducer creates relationship records from canonical event evidence:

- `message` and `handoff` events with `targetAgentId`
- `metadata.relationships` arrays used by deterministic social/routine fixtures
- `metadata.socialDiffusion.heardFromAgentId`
- `metadata.socialDiffusion.spreadsToAgentIds`

Each relationship stores the stable pair of agent IDs, strength, interaction
counts, message/handoff/declaration/diffusion counts, last evidence event, and a
bounded list of evidence event IDs. The IDs are stable and deterministic for a
given replay input. The UI may display this state as social proof, but Phaser,
sprites, Tiled objects, and local UI selection must not create relationship
facts.

The dedicated Graph View is also a projection of this state. Its search box,
kind toggles, selected-agent filter, SVG graph, and evidence jump buttons only
read `WorldState.relationships` plus the canonical `AgentEvent[]`; they do not
create relationships or change replay.

This makes Social day relationship evidence inspectable without introducing an
autonomous social simulation claim.

## Boundary

`src/events/*` must not import React, DOM, Phaser, canvas, Zustand, or adapters.
Behavioral reducer logic is implemented later; this session defines the ontology
only.
