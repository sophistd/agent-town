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
