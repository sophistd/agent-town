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
| `durableMemory` | Versioned record showing which persisted memory record was recalled into the current event stream |
| `agentAddressableMemory` | Agent-scoped persistent-memory query, selected records, scores, and retrieval weights used to create planning evidence |

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

The deterministic `Memory plan` source uses the same persistent records as an
agent-addressable memory stream. Each durable-memory agent receives a query
built from its stored memory evidence, enriched by current-run context when the
same agent is present; the adapter scores durable records by relevance,
importance, recency, and agent affinity, then emits canonical `memory_read`,
`thinking`, and `decision` events with `metadata.agentAddressableMemory`.
The browser store remains an adapter boundary, not a projection fact.

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
- `runSummary`
- `warnings`
- `quarantinedEvents`

## Boundary

`src/events/*` must not import React, DOM, Phaser, canvas, Zustand, or adapters.
Behavioral reducer logic is implemented later; this session defines the ontology
only.
