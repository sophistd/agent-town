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
| Agent identity | Persona, routine, relationships, and memory history | Agent role/name from `AgentEvent`; cognitive/social seed personas and relationship IDs now present in deterministic fixture metadata | Partial |
| Observation | Agents perceive events and environment changes | `generativeRuntime.ts` emits observation-stage `memory_write` events | Initial |
| Memory stream | Chronological natural-language record of experiences | `MemoryRecord` stream exists inside deterministic generator; not yet persisted across runs | Initial |
| Retrieval | Dynamic memory retrieval by relevance, importance, recency | `retrieveMemories` scores and records retrieval evidence in event metadata | Initial |
| Reflection | Higher-level synthesis from memories | Generator emits reflection-stage `thinking` events with source memory IDs | Initial |
| Planning | Higher-level plans decomposed into actions | Generator emits planning-stage `decision` events with `planStep` metadata | Initial |
| Action/conversation | Agents act, talk, coordinate | Generator emits `handoff`, `message`, `tool_call`, and `done` events through the existing projection path; Social day emits 25 invitation messages | Partial |
| Emergent social behavior | Information spreads and coordination emerges from agent interaction over time | `Social day` deterministically models a user-seeded Valentine's invitation spreading through a 25-agent relationship graph | Initial |
| LLM behavior generation | LLM produces observations/reflections/plans/actions | Not implemented; deterministic generator is a scaffold for testable event shape | Missing |
| Persistent world/memory | Memory survives across simulation days | Not implemented beyond committed fixtures and evidence | Missing |
| Many agents | Reference environment used 25 agents | `Social day` fixture uses 25 agents and 150 canonical events | Initial |
| Human intervention | User can inject natural-language changes into the town | `Intervention` source turns an operator prompt into canonical observation/retrieval/reflection/planning/action/closure events with prior-run context | Initial |
| Evaluation | Believability and ablation evidence | Local type/test/build/Playwright evidence exists; no believability evaluation | Missing |

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
- `src/adapters/interventionAdapter.ts`
  - `parseNaturalLanguageIntervention`
  - `naturalLanguageInterventionAdapter`
- UI sources: `Cognitive`, `Social day`, `Intervention`
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
- Natural-language intervention metadata:
  - `intervention.prompt`
  - `intervention.intentId`
  - `intervention.previousRunId`
  - `intervention.previousEventCount`
  - `intervention.previousMemoryActionCount`
  - `intervention.targetLocation`
  - `intervention.generatedBy`

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
- a natural-language intervention prompt becomes canonical events through an
  adapter, not through renderer or UI-owned facts
- the existing town projection can render the run without source-specific
  renderer branches
- docs and evidence state that full Stanford parity is still incomplete

This slice cannot claim:

- autonomous social emergence
- persistent agent memory across sessions
- LLM-generated behavior
- free-form natural-language understanding beyond deterministic intent routing
- unscripted 25-agent-scale simulation
- final Stanford Smallville parity

## Next Real Gap

The next meaningful move is not more labels. It is one of:

- persist the memory stream across imported runs
- add an LLM-backed reflection/planning adapter behind the same deterministic
  event contract
- persist the intervention memory stream across sessions
- add relationship state as derived projection evidence, not renderer-owned
  state
- profile replay/rendering for 25-agent and larger fixtures
