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
| Daily routines | Agents follow and revise believable daily schedules across places and time | `Routine day` deterministically emits six routine phases for each of 25 agents, including memory retrieval, crowding conflict resolution, action, and memory writeback | Initial |
| Observation | Agents perceive events and environment changes | `generativeRuntime.ts` emits observation-stage `memory_write` events | Initial |
| Memory stream | Chronological natural-language record of experiences | `MemoryRecord` stream exists inside deterministic generator; browser-persisted Memory source now recalls extracted `memory_read` / `memory_write` evidence across imported runs | Initial |
| Retrieval | Dynamic memory retrieval by relevance, importance, recency | `retrieveMemories` scores fixture memory; persistent `Memory plan` now retrieves durable records per agent by relevance, importance, recency, and agent affinity | Initial |
| Reflection | Higher-level synthesis from memories | Generator emits reflection-stage `thinking` events with source memory IDs | Initial |
| Planning | Higher-level plans decomposed into actions | Generator emits planning-stage `decision` events with `planStep` and routine segment metadata | Initial |
| Action/conversation | Agents act, talk, coordinate | Generator emits `handoff`, `message`, `tool_call`, and `done` events through the existing projection path; Social day emits 25 invitation messages | Partial |
| Emergent social behavior | Information spreads and coordination emerges from agent interaction over time | `Social day` deterministically models a user-seeded Valentine's invitation spreading through a 25-agent relationship graph, and replay now derives inspectable relationship state from messages, handoffs, declarations, and diffusion metadata | Initial |
| LLM behavior generation | LLM produces observations/reflections/plans/actions | `LLM plan` builds a model-ready request, parses a model-shaped response into canonical events, and quarantines invalid output; current UI source uses a deterministic fixture and no live provider call | Initial |
| Persistent world/memory | Memory survives across simulation days | Versioned browser memory bank persists canonical memory-event evidence, recalls it as `memory_read` events, and feeds agent-addressable planning events; not yet a server-backed world database or autonomous memory engine | Initial |
| Many agents | Reference environment used 25 agents | `Social day` and `Routine day` fixtures use 25 agents and 150 canonical events each | Initial |
| Human intervention | User can inject natural-language changes into the town | `Intervention` source turns an operator prompt into canonical observation/retrieval/reflection/planning/action/closure events with prior-run context | Initial |
| Evaluation | Believability and ablation evidence | `evaluateSmallvilleRun` now computes a structural capability score, top gaps, and ablation coverage from canonical events plus replayed `WorldState`; no human believability study yet | Initial |

## Current Implementation Slice

The current slice adds deterministic cognitive evidence:

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
- `src/adapters/llmPlannerAdapter.ts`
  - `buildSmallvilleLlmPlannerRequest`
  - `parseLlmPlannerResponse`
  - `buildDeterministicLlmPlannerResult`
  - `llmPlannerAdapter`
- `src/events/smallvilleEvaluation.ts`
  - `evaluateSmallvilleRun`
  - structural capability scores
  - top missing/partial gaps
  - ablation coverage checks
- `src/state/persistentMemoryStore.ts`
  - versioned browser storage for durable memory records
- UI sources: `Cognitive`, `Social day`, `Routine day`, `Intervention`,
  `Memory`, `Memory plan`, `LLM plan`
- Replay-derived social projection:
  - `WorldState.relationships`
  - `selectRelationships`
  - `selectTopRelationships`
  - `selectAgentRelationships`
  - `selectRelationshipCount`
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
- Agent-addressable memory metadata:
  - `agentAddressableMemory.schemaVersion`
  - `agentAddressableMemory.agentId`
  - `agentAddressableMemory.latestEventId`
  - `agentAddressableMemory.retrievalQuery`
  - `agentAddressableMemory.selectedRecordIds`
  - `agentAddressableMemory.selectedSourceEventIds`
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
- Smallville evaluation projection:
  - `Smallville Eval` in Run Summary
  - overall structural score
  - top gaps
  - ablation coverage count
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
- each durable-memory agent can retrieve persistent records by persona/query,
  importance, recency, and agent affinity, then emit canonical retrieval,
  reflection, and planning evidence
- a model-planner contract can build a JSON request from prior events and
  durable memory records, parse a model-shaped response into canonical events,
  and quarantine invalid model output before replay
- social relationship state is derived from canonical event evidence and remains
  deterministic across replay
- the Run Summary can display a structural Smallville evaluation report derived
  from canonical `AgentEvent[]` plus replayed `WorldState`
- the evaluation report surfaces top gaps and ablation coverage without letting
  the renderer invent behavioral facts
- the existing town projection can render the run without source-specific
  renderer branches
- docs and evidence state that full Stanford parity is still incomplete

This slice cannot claim:

- autonomous social emergence
- autonomous/adaptive daily scheduling
- complete persistent agent memory across devices or server sessions
- provider-backed autonomous LLM-generated behavior
- human believability ratings or empirical ablation-study results
- free-form natural-language understanding beyond deterministic intent routing
- unscripted 25-agent-scale simulation
- final Stanford Smallville parity

## Next Real Gap

The next meaningful move is not more labels. It is one of:

- connect a real provider-backed LLM call behind the existing planner contract,
  keeping API keys out of browser code and preserving deterministic fixtures
- use agent-addressable memory retrieval inside provider-backed planning
- turn routine schedules into adapter-produced daily plans that can revise
  themselves from observation and memory evidence
- persist the intervention memory stream beyond browser-local storage
- promote replay-derived relationship state into a dedicated Graph view
- turn the structural evaluator into a human-review rubric or provider-backed
  benchmark while keeping evaluation evidence event-derived
- profile replay/rendering for 25-agent and larger fixtures
