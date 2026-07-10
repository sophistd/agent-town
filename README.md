# Agent Town

Agent Town is a v0.5 prototype for inspecting multi-agent runtime work as an
event-driven town.

First-run framing:

```text
This town is not a game simulation. It is a projection of agent runtime events.
The runtime facts come from AgentEvent. Town, Timeline, Detail, Graph, and
Memory views are projections.
```

Chinese demo copy:

```text
这个小镇不是自主生命模拟游戏。它是 Agent 运行事件的投影。
事实来自 AgentEvent；小镇、时间线、详情、关系和记忆视图只是投影。
```

```text
External source -> Adapter -> AgentEvent -> WorldState reducer -> projection views
```

## Source And Gates

Construction source:

- Notion root PRD and spec:
  https://app.notion.com/p/393acb4bb6e68173afe9f05fbcf69313
- Notion session runbook index:
  https://app.notion.com/p/393acb4bb6e681cc9b54c0c41957775a
- S15 final packaging runbook:
  https://app.notion.com/p/393acb4bb6e681bea31fedaf1f8c8ce2

Acceptance source:

- M0 gate: https://linear.app/infoark/issue/MDL-124
- M1 gate: https://linear.app/infoark/issue/MDL-125
- M2 gate: https://linear.app/infoark/issue/MDL-126
- M3 gate: https://linear.app/infoark/issue/MDL-127
- M4 gate: https://linear.app/infoark/issue/MDL-128
- M5 gate: https://linear.app/infoark/issue/MDL-129
- M5 implementation: https://linear.app/infoark/issue/MDL-145
- M5 red-check: https://linear.app/infoark/issue/MDL-152

Repository-level agent instructions live in `AGENTS.md`. Reusable session
prompts live in `docs/CODEX_PROMPTS.md`. Human review expectations live in
`docs/HUMAN_REVIEW_CHECKLIST.md`. Metrics and acceptance measurement live in
`docs/METRICS.md`.

## Local Setup

Install dependencies:

```bash
pnpm install
```

Run the local app:

```bash
pnpm dev
```

Open the Vite URL printed by the command, usually:

```text
http://127.0.0.1:5173/
```

Run the local world-memory server:

```bash
AGENT_TOWN_WORLD_MEMORY_FILE=/tmp/agent-town-world-memory.json pnpm world-memory:server
```

The server binds to `127.0.0.1:8787` by default. Override it with `HOST`,
`PORT`, `AGENT_TOWN_WORLD_MEMORY_HOST`, or `AGENT_TOWN_WORLD_MEMORY_PORT`.

It exposes:

- `GET /health`
- `POST /memory/ingest`
- `GET /memory/recall`
- `POST /memory/plan`
- `POST /provider-loop`

The server accepts event-shaped JSON input, validates it through the canonical
event validator, persists only canonical memory events, and returns recall or
planning output as canonical `AgentEvent` evidence. The file remains a backing
store; it does not become `WorldState` or renderer-owned truth.

`src/adapters/worldMemoryProviderLoop.ts` connects that server to the existing
provider planner boundary: it sends external event streams into the
world-memory server, recalls durable memory as canonical events, rebuilds
provider request records from that recall evidence, asks the server for a
Memory plan context, and then calls the same OpenAI Responses planner adapter.
Without an API key it still builds inspectable server-backed provider request
evidence but does not call the provider.

The long-running server can also accept live HTTP sender events directly:

```bash
curl -X POST http://127.0.0.1:8787/provider-loop \
  -H 'content-type: application/json' \
  --data '{"events":[...],"maxAgents":2}'
```

`/provider-loop` accepts canonical event-shaped JSON, rejects API keys in the
request body, runs the same server-backed provider loop, and returns canonical
provider events plus a secret-free summary. Provider credentials, if used, must
come from the local/server environment such as `OPENAI_API_KEY`; without them
the route returns the existing `missing_openai_api_key` warning and does not
call the provider.

The Import Source panel includes a `Provider HTTP` action that posts the current
workbench event stream to `http://127.0.0.1:8787/provider-loop`. The server only
allows local browser CORS origins. With no API key, the workbench still replays
the returned recall and Memory plan events as canonical evidence.

Run the JSONL external-sender provider loop:

```bash
AGENT_TOWN_WORLD_MEMORY_FILE=/tmp/agent-town-provider-loop-memory.json \
  pnpm world-memory:provider-loop docs/samples/sample-native.jsonl
```

This starts a temporary local world-memory server, sends the JSONL events
through the provider loop, and prints a secret-free summary. Set
`OPENAI_API_KEY` only in the local/server environment to attempt a live provider
call; without it, the runner still produces request evidence and returns the
existing `missing_openai_api_key` warning.

Run a deterministic external runtime stream:

```bash
AGENT_TOWN_WORLD_MEMORY_FILE=/tmp/agent-town-runtime-stream-memory.json \
  pnpm smallville:runtime-stream
```

The runtime stream emits canonical `AgentEvent` batches over multiple ticks,
annotates them with `metadata.externalRuntime`, posts each tick to the live
local `/provider-loop` route, and prints a secret-free summary. This proves the
external runtime sender path without introducing a new event schema. Without a
local/server API key, provider events remain empty and
`missing_openai_api_key` is surfaced instead of being hidden.

Run a bounded Smallville-style scheduler:

```bash
AGENT_TOWN_WORLD_MEMORY_FILE=/tmp/agent-town-scheduler-memory.json \
  pnpm smallville:scheduler
```

The scheduler adds a virtual world clock and phase plan over routine,
cognitive, and social ticks. Each tick still emits canonical `AgentEvent`
batches and sends them to `/provider-loop`; the scheduler summary only records
phase counts, virtual time, memory/provider-loop counts, warnings, and
provenance. Without a local/server API key, provider events remain empty and
`missing_openai_api_key` is surfaced instead of being hidden.

Required checks before finishing code or evidence work:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## What The Prototype Shows

The app starts with a deterministic mock failure run. It is meant to answer one
product question: can an operator understand what a multi-agent runtime did,
where the work moved, why it blocked, and what evidence closed it?

The current surface includes:

- a Phaser town canvas that renders `WorldState`
- stable town zones for planning, research, production, memory, review, queue,
  and final state
- a project-authored Tiled-compatible pixel map with generated tiles, buildings,
  agents, and interior anchors
- agent marks, role colors, status markers, bubbles, and handoff/message edges
- replay-derived relationship state for social runs, surfaced in Run Summary
  and Detail without renderer-owned facts
- a dedicated Graph View that filters replay-derived relationships by kind,
  selected agent, text query, and evidence event jumps
- a Run Summary `Smallville Eval` projection that scores structural
  capability evidence, top gaps, and ablation coverage from `AgentEvent` plus
  replayed `WorldState`
- a Timeline with playback, cursor jumping, and current-event selection
- a Detail panel for the selected event and run summary
- an Import Source panel for mock, Town day, Cognitive, Social day,
  Routine day, natural-language Intervention, persistent Memory, Memory plan,
  LLM plan, native JSONL, WebSocket-shaped input, and Provider HTTP
- adapter warnings and quarantine counts

## Architecture

`AgentEvent` is the only source of truth.

```text
src/adapters/*  -> converts external input into canonical AgentEvent
src/events/*    -> schema, fixtures, validation, routing, reducer, selectors
src/state/*     -> playback and selection state
src/game/*      -> Phaser projection of WorldState only
src/ui/*        -> React shell, controls, timeline, detail, import panel
docs/evidence/* -> proof for Notion sessions and Linear gates
```

Important boundaries:

- No React, DOM, Phaser, or canvas imports belong in `src/events/reducer.ts`.
- No adapter-specific logic belongs in `src/game/*`.
- No renderer-owned business facts. Renderers consume `WorldState`.
- Unknown events and invalid adapter input must not crash playback.
- External visual assets require a license entry in `docs/ASSET_LICENSES.md`.

## Demo Run

Use `docs/DEMO_SCRIPT.md` as the operator script.

Quick path:

1. Start the app with `pnpm dev`.
2. Open the local Vite URL.
3. Read the first-run framing aloud: the town is a runtime-event projection,
   not an autonomous game simulation.
4. Start from the default mock failure run.
5. Use Timeline to jump through planning, research, coding, error, blocked,
   repair, review, memory write, and done events.
6. Use Import Source -> Town day to inspect the Smallville-like day fixture:
   five agents moving through stable zones, interior anchors, bubbles, handoff
   edges, and activity labels.
7. Use Import Source -> Cognitive to inspect the deterministic cognitive-loop
   fixture: observation, memory retrieval, reflection, planning, action, and
   closure evidence all represented as canonical `AgentEvent` metadata.
8. Use Import Source -> Social day to inspect the 25-agent invitation diffusion
   fixture: a user-seeded Valentine's gathering spreads through relationships
   as canonical observation, retrieval, reflection, planning, message, and
   attendance events. Run Summary, Graph View, and Detail expose replay-derived
   relationship strength, kind counts, filters, and evidence jumps from
   `WorldState.relationships`.
9. Use Import Source -> Routine day to inspect the 25-agent routine scheduler
   fixture: every agent observes an intention, retrieves memory, reflects on
   schedule fit, resolves deterministic crowding conflicts, plans, acts, and
   writes back routine memory as canonical `AgentEvent` evidence.
10. Use Import Source -> Intervention to turn a natural-language operator
   prompt into canonical `AgentEvent` evidence. The adapter uses the current run
   as prior context, then emits observation, retrieval, reflection, planning,
   message, action, and closure events.
11. Use Import Source -> Memory to recall the memory stream persisted from
   previous imported runs. The browser store is a source boundary; recall still
   becomes canonical `memory_read` events before projection.
12. Use Import Source -> Memory plan to let each durable-memory agent retrieve
   relevant records by agent identity, query relevance, importance, and
   recency, then emit retrieval, reflection, and planning evidence as canonical
   events.
13. Use Import Source -> LLM plan to inspect the model-planner contract path:
   the request is built from prior events plus agent-addressable memory
   retrieval evidence, then a model-shaped JSON response is parsed, validated,
   quarantined if invalid, and replayed only as canonical `AgentEvent`
   evidence. This is still a deterministic contract fixture in the browser, not
   a live model provider call.
14. Use Run Summary -> Smallville Eval on Cognitive, Social day, Routine day,
    Memory plan, or LLM plan sources to inspect the structural score, top gaps,
    and ablation coverage. This is a projection report, not a human
    believability study.
15. Use Detail to inspect the selected event fields.
16. Use Import Source -> JSONL to import the native JSONL sample in the text
   area.
17. Use Import Source -> WS sample to prove the WebSocket adapter path reaches
   the same projection pipeline.
18. Start `pnpm world-memory:server`, then use Import Source -> Provider HTTP
    to post the current run to `/provider-loop`. With no local API key, the
    workbench should still replay server-backed recall and Memory plan evidence
    and show `missing_openai_api_key` as a warning.
19. Run `pnpm smallville:runtime-stream` with an explicit
    `AGENT_TOWN_WORLD_MEMORY_FILE` to prove a deterministic external runtime can
    emit ticked canonical event batches into the live `/provider-loop` route.
20. Run `pnpm smallville:scheduler` with an explicit
    `AGENT_TOWN_WORLD_MEMORY_FILE` to prove a bounded world-clock schedule can
    cycle routine, cognitive, and social ticks through the same provider-loop
    route while memory accumulates across ticks.

Relevant screenshots and evidence:

- `docs/evidence/M5/visual-layout.png`
- `docs/evidence/M5/visual-layout.md`
- `docs/evidence/M5/performance-200-events.md`
- `docs/evidence/M5/final-demo-notes.md`
- `docs/evidence/M5/smallville-graph-view.md`
- `docs/evidence/M5/smallville-external-runtime-stream.md`
- `docs/evidence/M5/smallville-autonomous-scheduler.md`
- `docs/evidence/M4/source-switcher.png`
- `docs/SMALLVILLE_PARITY.md`

## JSONL Import

The JSONL path accepts one canonical `AgentEvent` JSON object per non-empty line.
Use the built-in Import Source text area or the sample file:

```text
docs/samples/sample-native.jsonl
```

Rules:

- Each line must already be a canonical `AgentEvent`.
- Missing required fields are quarantined.
- Duplicate event IDs are quarantined.
- Duplicate `(runId, sequence)` pairs are quarantined.
- Existing `metadata.source` is preserved.
- Missing `metadata.source` becomes `jsonl`.
- Invalid timestamps create a warning but do not block replay, because replay
  uses `sequence`.

More detail lives in `docs/ADAPTER_GUIDE.md`.

## WebSocket Import

The WebSocket adapter accepts JSON messages from:

```text
ws://localhost:8765/events
```

Messages may be canonical `AgentEvent` objects or supported source-shaped
objects. The adapter normalizes them, validates them, quarantines invalid
messages, and appends accepted events to the WebSocket run.

The UI includes a `WS sample` button so the demo can prove the adapter path
without requiring a live WebSocket server.

## Adding An Event Type

Keep the change event-first:

1. Add the type to `src/events/constants.ts`.
2. Extend the `AgentEventType` type in `src/events/types.ts` if needed.
3. Update validation behavior in `src/events/validators.ts`.
4. Update routing in `src/events/routing.ts`.
5. Update reducer behavior in `src/events/reducer.ts`.
6. Update visual labels or colors in `src/game/visualMapping.ts`.
7. Add deterministic fixture coverage.
8. Add or update tests under `src/tests/`.
9. Document the type in `docs/EVENT_SCHEMA.md`.

Do not make the renderer invent facts for the new event. The renderer should
only project the resulting `WorldState`.

## Adding A Building Or Zone

Buildings are projection targets for event locations.

1. Add or confirm the location ID in `src/events/constants.ts` and
   `src/events/types.ts`.
2. Add coordinates in `src/events/routing.ts`.
3. Add or update routing rules that map event types or `locationHint` values to
   the new location.
4. Update labels, colors, or placeholder shapes in `src/game/visualMapping.ts`
   and renderer helpers.
5. Update `public/maps/town-v1.tiled.json` if the rendered object map needs a
   new building footprint or anchor.
6. Document the new zone in `docs/VISUAL_MAPPING.md`.
7. Add screenshot evidence if the change is visual.

The current Tiled-compatible object map must preserve the stable location IDs
documented in `docs/VISUAL_MAPPING.md`. Map object names, sprite names, and
building labels are projection metadata only; they must not create runtime
facts.

Interior anchors follow the same rule. `public/maps/town-v1.tiled.json` may
define generated objects such as `library_stacks` or `workshop_bench`, but an
agent only renders there when an `AgentEvent` carries matching
`metadata.subLocationId`. The renderer must fall back to the stable zone when
that metadata is missing or unknown.

## Adding An Agent Role

Agent roles are stable runtime identities, not visual-only labels.

1. Add or confirm the role value in `src/events/constants.ts` and
   `src/events/types.ts`.
2. Update validation in `src/events/validators.ts` if the role vocabulary
   changes.
3. Add role color, label, or marker behavior in `src/game/visualMapping.ts`.
4. Add fixture coverage that proves the role can appear in an `AgentEvent`.
5. Add or update reducer/renderer tests if role behavior changes.
6. Document the role in `docs/EVENT_SCHEMA.md` and `docs/VISUAL_MAPPING.md`.

Do not infer a role from sprite choice or building position. Role must come
from the event stream and derived `WorldState`.

## Moving Toward Smallville

`docs/SMALLVILLE_PARITY.md` tracks the actual gap to Stanford Smallville-style
generative agents. The current `Cognitive`, `Social day`, `Routine day`,
`Intervention`, `Memory`, `Memory plan`, and `LLM plan` sources are deterministic: they emit
observation, memory retrieval, reflection, planning, action/conversation, social
diffusion, routine scheduling, deterministic routine-conflict resolution,
natural-language intervention, durable memory recall, agent-addressable memory
planning, model-planner requests that include agent-addressable retrieval
scores, model-planner contract parsing/quarantine, and closure as canonical
`AgentEvent` records. They are testable event contracts for future live
provider-backed behavior, not a claim that the app already has autonomous
social emergence, adaptive schedules, or complete persistent agent cognition.

## Adding An Adapter

Adapters are source boundaries.

1. Create `src/adapters/<source>Adapter.ts`.
2. Parse source input into candidate event objects.
3. Map source fields into canonical `AgentEvent` fields.
4. Preserve source metadata under `metadata`.
5. Validate every mapped event with `validateAgentEvent`.
6. Quarantine invalid candidates instead of throwing.
7. Document duplicate ID and duplicate sequence policy.
8. Add adapter tests.
9. Record evidence under `docs/evidence/M4/` or the current session folder.

Do not add source-specific branches to Phaser renderers or projection
components.

## Visual Density Rules

The prototype is allowed to be dense, but not ambiguous.

- Bubbles are truncated on the canvas so long text does not cover the town.
- Detail expansion belongs in `DetailPanel`, where the full event can be read.
- Timeline and summary views are the event filters for blocked, error, tool,
  memory, and done checkpoints.
- Status summarization must remain visible through marker color, marker label,
  run summary counts, and selected-event detail.
- Canvas visuals must prioritize stable identity, status, and route over
  decorative fidelity.

Detailed mapping lives in `docs/VISUAL_MAPPING.md`.

## Known Limitations

- The current visual system uses a project-authored Tiled-compatible JSON map,
  generated pixel tileset, generated agent/building sprite sheets, and a baked
  pixel-town background. External or third-party visual assets remain deferred
  until license and fallback behavior are recorded.
- The app does not yet include a modal onboarding surface. The first-run copy is
  documented here, in `docs/DEMO_SCRIPT.md`, and in final demo notes for the M5
  review.
- The WebSocket demo path has a built-in sample; a real runtime sender still
  needs to emit canonical or supported source-shaped messages.
- Persistent memory currently uses versioned browser storage for canonical
  `memory_read` / `memory_write` evidence extracted from imported runs. The
  `Memory plan` source can retrieve those records per agent by query relevance,
  importance, recency, and agent affinity. `src/state/filePersistentMemoryStore.ts`
  adds a local/server-side file-backed store using the same snapshot schema, and
  `src/adapters/worldMemoryRuntime.ts` can ingest canonical event streams into
  that file store before building recall or Memory plan output.
  `src/server/worldMemoryHttpServer.ts` and `pnpm world-memory:server` expose
  that boundary as a long-running local/server HTTP process.
  `src/adapters/worldMemoryProviderLoop.ts` can feed server-backed durable
  memory into the OpenAI planner boundary, and
  `pnpm world-memory:provider-loop` can drive that path from canonical JSONL
  event streams. The long-running server also exposes `POST /provider-loop` for
  live HTTP sender events without accepting secrets in request bodies, and the
  browser workbench can post its current event stream to that route as a
  Provider HTTP source. `pnpm smallville:runtime-stream` can emit deterministic
  external runtime ticks into the same route. `pnpm smallville:scheduler` adds
  a bounded world-clock phase plan over routine, cognitive, and social ticks
  while keeping each tick replayable as canonical events. This is still not a
  multi-user database or full autonomous memory engine.
- Routine scheduling is still deterministic fixture evidence plus a bounded
  scheduler runner. The app can show routine phases and crowding-resolution
  events for 25 agents, but it is not yet an unbounded autonomous day planner.
- The `LLM plan` source proves the request/response parser contract and the
  adapter now includes an OpenAI Responses provider boundary for local or
  server-side runtimes. Provider requests now include agent-addressable memory
  retrieval snapshots, selected records, source event IDs, and retrieval
  weights. The browser UI still uses a deterministic fixture and does not
  receive API keys; a live provider run requires `OPENAI_API_KEY` outside
  browser code.
- The graph and memory views are represented through current projection data,
  detail, summary, edges, persistent memory recall, and memory events; separate
  dedicated tabs are future work.
- Performance evidence covers deterministic 200-event replay and local demo
  usability. It is not a browser frame-rate benchmark.
- This public repository currently has no formal open-source `LICENSE` file.
  Do not import external art or publish asset-license claims until that choice
  is explicit.

## Next Phase

See `docs/NEXT_PHASE.md`.
