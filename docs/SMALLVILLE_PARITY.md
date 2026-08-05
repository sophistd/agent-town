# Smallville Parity Matrix

This document keeps the goal honest: Agent Town is moving toward a
Stanford-Smallville-style generative-agent town, but it is not there yet.

Primary reference:

- Park et al., "Generative Agents: Interactive Simulacra of Human Behavior":
  https://arxiv.org/abs/2304.03442
- Stanford HAI overview:
  https://hai.stanford.edu/news/computational-agents-exhibit-believable-humanlike-behavior

## Target Shape

The Stanford Smallville reference is not just a pixel town. The important
behavioral stack is:

```text
agent persona
-> observation
-> memory stream
-> memory retrieval
-> reflection
-> planning
-> action / conversation
-> updated memory stream
-> emergent social coordination
```

Agent Town keeps a different product invariant:

```text
External source -> Adapter -> AgentEvent -> WorldState -> Projection views
```

Therefore the path to parity must represent cognition as event evidence before
the renderer sees it. Phaser, Tiled, sprites, and UI state must not create
runtime facts.

## Current Parity Matrix

| Capability | Stanford Smallville bar | Agent Town current state | Status |
| --- | --- | --- | --- |
| Top-down town | Small town with homes/workplaces and many agents | Original generated pixel town, stable zones, interior anchors, sprites, bubbles, edges | Partial |
| Agent identity | Persona, routine, relationships, and memory history | Agent role/name from `AgentEvent`; cognitive/social/routine seed personas, daily intentions, routine segments, and replay-derived `WorldState.relationships` now present | Partial |
| Daily routines | Agents follow and revise believable daily schedules across places and time | `Routine day` deterministically emits six routine phases for each of 25 agents; `Adaptive routine` revises those schedules from new observations plus prior memory/routine evidence; `pnpm smallville:scheduler` now cycles routine, cognitive, and social phases over a bounded virtual clock, can checkpoint/resume across process invocations, and can stop at a supervised elapsed-time window while keeping each completed tick canonical | Initial |
| Observation | Agents perceive events and environment changes | `generativeRuntime.ts` emits observation-stage `memory_write` events | Initial |
| Memory stream | Chronological natural-language record of experiences | `MemoryRecord` stream exists inside deterministic generator; browser-persisted Memory source now recalls extracted `memory_read` / `memory_write` evidence across imported runs | Initial |
| Retrieval | Dynamic memory retrieval by relevance, importance, recency | `retrieveMemories` scores fixture memory; persistent `Memory plan` now retrieves durable records per agent by relevance, importance, recency, and agent affinity | Initial |
| Reflection | Higher-level synthesis from memories | Generator emits reflection-stage `thinking` events with source memory IDs | Initial |
| Planning | Higher-level plans decomposed into actions | Generator emits planning-stage `decision` events with `planStep` and routine segment metadata | Initial |
| Action/conversation | Agents act, talk, coordinate | Generator emits `handoff`, `message`, `tool_call`, and `done` events through the existing projection path; Social day emits 25 invitation messages | Partial |
| Emergent social behavior | Information spreads and coordination emerges from agent interaction over time | `Social day` deterministically models a user-seeded Valentine's invitation spreading through a 25-agent relationship graph; replay derives inspectable relationship state and Graph View exposes filtering plus evidence jumps | Initial |
| LLM behavior generation | LLM produces observations/reflections/plans/actions | `LLM plan` builds a model-ready request from prior events plus agent-addressable memory retrieval, parses model-shaped responses into canonical events, quarantines invalid output, and has an OpenAI Responses provider boundary with mock-fetch coverage; the world-memory provider loop can feed server-backed recall evidence into that boundary, but no live provider call was run without an API key | Initial |
| Persistent world/memory | Memory survives across simulation days | Versioned browser memory bank persists canonical memory-event evidence, file-backed local/server snapshots now use the same schema, a local/server HTTP process can ingest canonical event streams into that store, recall emits `memory_read` events, Memory plan feeds agent-addressable planning, provider-loop request evidence can be built from server recall, a JSONL external-sender runner can drive the loop, `POST /provider-loop` accepts live HTTP sender events, the browser workbench can call that route as a Provider HTTP source, `pnpm smallville:runtime-stream` can emit deterministic external runtime ticks into the same route, and `pnpm smallville:scheduler` can run, stop under elapsed-time supervision, and resume a bounded world-clock phase plan with cross-tick and cross-process memory accumulation; not yet a multi-user world database or autonomous memory engine | Initial |
| Many agents | Reference environment used 25 agents | `Social day` and `Routine day` fixtures use 25 agents and 150 canonical events each | Initial |
| Human intervention | User can inject natural-language changes into the town | `Intervention` source turns an operator prompt into canonical observation/retrieval/reflection/planning/action/closure events with prior-run context | Initial |
| Evaluation | Believability and ablation evidence | `evaluateSmallvilleRun` now computes a structural capability score, top gaps, ablation coverage, and a human-review rubric from canonical events plus replayed `WorldState`; no completed human-subject believability study yet | Initial |

## Current M5 Implementation Spine

The current M5 branch now includes deterministic cognitive evidence, durable
memory boundaries, provider-loop bridges, browser workbench integration, and a
deterministic external runtime stream, and bounded scheduler runner:

- `src/events/generativeRuntime.ts`
  - `MemoryRecord`
  - `scoreMemoryRecord`
  - `retrieveMemories`
  - `generateSmallvilleCognitiveRun`
  - `mockSmallvilleCognitiveRun`
  - `generateSmallvilleSocialRun`
  - `summarizeSocialDiffusion`
  - `mockSmallvilleSocialRun`
  - `generateSmallvilleRoutineRun`
  - `summarizeRoutineDay`
  - `mockSmallvilleRoutineRun`
- `src/adapters/interventionAdapter.ts`
  - `parseNaturalLanguageIntervention`
  - `naturalLanguageInterventionAdapter`
- `src/events/persistentMemory.ts`
  - `extractPersistentMemoryRecords`
  - `mergePersistentMemoryRecords`
  - `retrievePersistentMemoryRecords`
- `src/adapters/persistentMemoryAdapter.ts`
  - `buildPersistentMemoryRecallResult`
  - `buildAgentAddressableMemoryPlanResult`
  - `persistentMemoryAdapter`
- `src/adapters/worldMemoryRuntime.ts`
  - `ingestEventsIntoFileWorldMemory`
  - `buildFileWorldMemoryRecallResult`
  - `buildFileWorldMemoryPlanResult`
- `src/adapters/adaptiveRoutineAdapter.ts`
  - `buildAdaptiveRoutinePlanResult`
  - `summarizeAdaptiveRoutineRevisions`
  - `adaptiveRoutineAdapter`
- `src/adapters/llmPlannerAdapter.ts`
  - `buildSmallvilleLlmPlannerRequest`
  - `buildOpenAiResponsesPlannerBody`
  - `callOpenAiLlmPlanner`
  - `parseLlmPlannerResponse`
  - `buildDeterministicLlmPlannerResult`
  - `llmPlannerAdapter`
- `src/events/smallvilleEvaluation.ts`
  - `evaluateSmallvilleRun`
  - structural capability scores
  - top missing/partial gaps
  - ablation coverage checks
  - human-review believability rubric
- `src/state/persistentMemoryStore.ts`
  - versioned browser storage for durable memory records
- `src/state/filePersistentMemoryStore.ts`
  - local/server-side file-backed snapshot store for durable memory records
- UI sources: `Cognitive`, `Social day`, `Routine day`, `Intervention`,
  `Adaptive routine`, `Memory`, `Memory plan`, `LLM plan`
- Replay-derived social projection:
  - `WorldState.relationships`
  - `selectRelationships`
  - `selectTopRelationships`
  - `selectAgentRelationships`
  - `selectRelationshipCount`
- Dedicated Graph View:
  - `src/ui/relationshipGraphModel.ts`
  - `src/ui/RelationshipGraphPanel.tsx`
  - relationship kind filters
  - selected-agent filter
  - text search over agents, tags, events, and evidence IDs
  - evidence-event jump buttons
- Metadata stages:
  - `observation`
  - `retrieval`
  - `reflection`
  - `planning`
  - `action`
  - `conversation`
  - `closure`
- Social diffusion metadata:
  - `intervention`
  - `relationships`
  - `socialDiffusion.eventId`
  - `socialDiffusion.wave`
  - `socialDiffusion.heardFromAgentId`
  - `socialDiffusion.spreadsToAgentIds`
  - `socialDiffusion.attended`
- Routine metadata:
  - `routine.dayId`
  - `routine.phase`
  - `routine.segmentId`
  - `routine.startMinute`
  - `routine.endMinute`
  - `routine.scheduledLocation`
  - `routine.scheduledSubLocationId`
  - `routine.plannedActivity`
  - `routine.intention`
  - `routine.conflictId`
  - `routineConflict.conflictId`
  - `routineConflict.capacity`
  - `routineConflict.crowdedSubLocationId`
  - `routineConflict.involvedAgentIds`
  - `routineConflict.shiftedToLocation`
  - `routineConflict.shiftedToSubLocationId`
  - `routineConflict.resolution`
- Adaptive routine revision metadata:
  - `routineRevision.schemaVersion`
  - `routineRevision.revisionId`
  - `routineRevision.observationId`
  - `routineRevision.observationContent`
  - `routineRevision.observationImportance`
  - `routineRevision.reason`
  - `routineRevision.previousRunId`
  - `routineRevision.previousTaskId`
  - `routineRevision.previousEventId`
  - `routineRevision.previousRoutineEventIds`
  - `routineRevision.selectedMemoryEventIds`
  - `routineRevision.previousLocation`
  - `routineRevision.previousSubLocationId`
  - `routineRevision.revisedLocation`
  - `routineRevision.revisedSubLocationId`
  - `routineRevision.generatedBy`
- Natural-language intervention metadata:
  - `intervention.prompt`
  - `intervention.intentId`
  - `intervention.previousRunId`
  - `intervention.previousEventCount`
  - `intervention.previousMemoryActionCount`
  - `intervention.targetLocation`
  - `intervention.generatedBy`
- Persistent memory metadata:
  - `durableMemory.schemaVersion`
  - `durableMemory.recordId`
  - `durableMemory.sourceEventId`
  - `durableMemory.sourceRunId`
  - `durableMemory.sourceType`
  - `durableMemory.memoryId`
  - `durableMemory.retrievalQuery`
  - `durableMemory.savedAt`
- File-backed persistent memory store:
  - same snapshot schema as browser persistent memory
  - atomic temporary file + rename writes
  - explicit warnings for missing, unreadable, invalid, or unwritable files
- File-backed world memory runtime:
  - validates incoming event-shaped input before persistence
  - quarantines invalid events
  - persists only canonical `memory_read` / `memory_write` records
  - builds recall and agent-addressable plan output from the same file snapshot
- Local/server world memory process:
  - `src/server/worldMemoryHttpServer.ts`
  - `pnpm world-memory:server`
  - exposes `/memory/ingest`, `/memory/recall`, and `/memory/plan`
  - validates prior-event planning context before using it
  - keeps HTTP responses adapter-shaped instead of producing `WorldState`
- World-memory provider loop:
  - `src/adapters/worldMemoryProviderLoop.ts`
  - sends external event streams to the world-memory server
  - reconstructs provider request records from canonical recall events
  - calls server Memory plan for prior context
  - sends the result through `callOpenAiLlmPlanner`
  - preserves missing-key no-call behavior
- JSONL external-sender runner:
  - `src/server/worldMemoryProviderLoopRunner.ts`
  - `pnpm world-memory:provider-loop`
  - reads native JSONL `AgentEvent` lines
  - starts and closes a local world-memory server around the run
  - prints a secret-free provider-loop summary
- Live HTTP provider-loop sender:
  - `POST /provider-loop` on `src/server/worldMemoryHttpServer.ts`
  - accepts live event-shaped JSON input without a JSONL file
  - rejects `apiKey`, `openAiApiKey`, and `OPENAI_API_KEY` in request bodies
  - calls the existing server-backed provider loop
  - returns canonical provider events plus a secret-free summary
- Provider HTTP workbench source:
  - `src/adapters/providerLoopHttpAdapter.ts`
  - Import Source button `Provider HTTP`
  - posts current workbench events to `/provider-loop`
  - validates returned recall, Memory plan, and provider events before replay
  - replays server-backed memory evidence even when provider events are empty
    because no local API key is configured
- Deterministic external runtime stream:
  - `src/server/smallvilleExternalRuntimeStreamRunner.ts`
  - `scripts/smallville-runtime-stream.mjs`
  - `pnpm smallville:runtime-stream`
  - emits canonical `AgentEvent` batches over multiple ticks
  - annotates each emitted event with `metadata.externalRuntime`
  - posts each tick to the live `/provider-loop` route
  - writes a secret-free summary plus optional emitted-event JSONL evidence
- Bounded autonomous scheduler:
  - `src/server/smallvilleAutonomousSchedulerRunner.ts`
  - `scripts/smallville-autonomous-scheduler.mjs`
  - `pnpm smallville:scheduler`
  - cycles routine, cognitive, and social phases over a virtual world clock
  - annotates each emitted event with `metadata.scheduler`
  - posts each tick to the live `/provider-loop` route
  - carries memory across ticks through the local/server file-backed
    world-memory store
  - can write `smallville-autonomous-scheduler-checkpoint` state after each
    tick and resume from `nextTickIndex` in a later process
  - can stop after `AGENT_TOWN_SCHEDULER_MAX_ELAPSED_MS` while preserving the
    last completed tick, checkpoint, and next resumable tick
  - writes a secret-free summary plus optional emitted-event JSONL evidence
- Agent-addressable memory metadata:
  - `agentAddressableMemory.schemaVersion`
  - `agentAddressableMemory.agentId`
  - `agentAddressableMemory.latestEventId`
  - `agentAddressableMemory.retrievalQuery`
  - `agentAddressableMemory.selectedRecordIds`
  - `agentAddressableMemory.selectedSourceEventIds`
  - `agentAddressableMemory.selectedForAgentIds`
  - `agentAddressableMemory.selectedRecords`
  - `agentAddressableMemory.retrievals`
  - `agentAddressableMemory.averageScore`
  - `agentAddressableMemory.weights`
- LLM planner metadata:
  - `llmPlanner.schemaVersion`
  - `llmPlanner.contractVersion`
  - `llmPlanner.requestId`
  - `llmPlanner.responseRequestId`
  - `llmPlanner.promptHash`
  - `llmPlanner.model`
  - `llmPlanner.modelRole`
  - `llmPlanner.responseStepId`
  - `llmPlanner.previousRunId`
  - `llmPlanner.previousEventCount`
  - `llmPlanner.selectedMemoryRecordIds`
  - `llmPlanner.selectedMemorySourceEventIds`
  - `llmPlanner.agentAddressableRetrievalCount`
  - `llmPlanner.agentAddressableSelectedRecordCount`
- Smallville evaluation projection:
  - `Smallville Eval` in Run Summary
  - overall structural score
  - top gaps
  - ablation coverage count
  - adaptive routine revision count
  - event, agent, relationship, social, and routine evidence counts

This is intentionally not a free-running agent simulation. It is a deterministic
contract test for the cognitive evidence shape that a future LLM-backed adapter
must produce.

## Acceptance Boundary

This slice can pass if:

- the cognitive run validates as canonical `AgentEvent[]`
- replay is deterministic and warning-free
- retrieval scores are inspectable in event metadata
- reflections record their source memory IDs
- plans record their next action
- the 25-agent social run shows the Valentine's invitation reaching every agent
  through inspectable message events
- the 25-agent routine run shows six routine phases per agent, 50 memory-write
  events, 25 memory-read events, deterministic crowding conflicts, and
  warning-free replay
- a natural-language intervention prompt becomes canonical events through an
  adapter, not through renderer or UI-owned facts
- memory events from imported runs persist into a versioned browser memory bank
  and recall as canonical `memory_read` events
- local/server runtimes can persist the same memory snapshot schema into a
  file-backed world-memory store with explicit failure warnings
- local/server runtimes can ingest canonical event streams into that file-backed
  store, then build recall or agent-addressable planning output from the same
  durable snapshot
- a long-running local/server HTTP process can keep that same file-backed
  memory available across separate ingest, recall, and plan requests without
  letting the process own projection facts
- a provider-loop adapter can feed external event streams through the
  world-memory process, rebuild provider records from canonical recall events,
  request server-backed Memory plan context, and call the existing provider
  planner boundary without bypassing parser/quarantine validation
- a JSONL external-sender runner can drive that provider loop from a canonical
  event file, capture a secret-free summary, and preserve missing-key no-call
  behavior
- a live HTTP sender can post event-shaped JSON to `/provider-loop`, drive the
  same provider loop without JSONL files, reject request-body secrets, return
  canonical provider events, and preserve missing-key no-call behavior
- the browser workbench can post its current event stream to `/provider-loop`
  as a Provider HTTP source, validate returned events again, and replay
  server-backed recall / Memory plan evidence without sending secrets
- a bounded scheduler runner can cycle routine, cognitive, and social phases
  through `/provider-loop` under a virtual world clock while memory accumulates
  across ticks in the local/server world-memory store
- scheduler checkpoint/resume can continue from the next tick across process
  invocations while preserving the same memory file, phase plan, and event
  sequence shape
- scheduler elapsed-time supervision can stop after completed ticks, report
  `elapsed_time_limit_reached`, and preserve the next resumable checkpoint
- each durable-memory agent can retrieve persistent records by persona/query,
  importance, recency, and agent affinity, then emit canonical retrieval,
  reflection, and planning evidence
- prior routine evidence can be adapted into 25 revised daily plans from new
  observation and memory evidence, with old/revised projection anchors and
  selected memory event IDs inspectable in `metadata.routineRevision`
- a model-planner contract can build a JSON request from prior events plus
  agent-addressable memory retrieval records, parse a model-shaped response
  into canonical events, and quarantine invalid model output before replay
- an OpenAI Responses provider boundary can build a `store: false` JSON-schema
  request with agent-addressable memory retrieval evidence, call through
  injected/runtime `fetch`, and pass provider `output_text` through the same
  parser/quarantine path
- social relationship state is derived from canonical event evidence and remains
  deterministic across replay
- the dedicated Graph View filters and jumps through relationship evidence
  without mutating replay or creating relationship facts
- the Run Summary can display a structural Smallville evaluation report derived
  from canonical `AgentEvent[]` plus replayed `WorldState`
- the evaluation report surfaces top gaps and ablation coverage without letting
  the renderer invent behavioral facts
- the evaluation report recognizes adaptive routine revision as schedule
  evidence without treating it as autonomous simulation
- the existing town projection can render the run without source-specific
  renderer branches
- docs and evidence state that full Stanford parity is still incomplete

This slice cannot claim:

- autonomous social emergence
- unbounded autonomous daily scheduling
- complete persistent agent memory across devices or server sessions
- live-verified provider-backed autonomous LLM-generated behavior
- human believability ratings or empirical ablation-study results
- free-form natural-language understanding beyond deterministic intent routing
- unscripted 25-agent-scale simulation
- final Stanford Smallville parity

## Next Real Gap

The next meaningful move is not more labels. It is one of:

- run and evidence a real provider-backed LLM call with a local/server-side API
  key while keeping keys out of browser code and consuming the existing
  world-memory provider-loop / external-runtime-stream request evidence
- run the resumable scheduler with a live provider-backed call, or extend the
  elapsed-time supervised scheduler into a longer observed runtime window while
  keeping each tick replayable as canonical events
- turn the structural evaluator into a human-review rubric or provider-backed
  benchmark while keeping evaluation evidence event-derived
- profile replay/rendering for 25-agent and larger fixtures
