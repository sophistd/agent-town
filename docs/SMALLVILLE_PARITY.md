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
| Agent identity | Persona, routine, relationships, and memory history | Agent role/name from `AgentEvent`; cognitive seed personas now present in deterministic fixture metadata | Partial |
| Observation | Agents perceive events and environment changes | `generativeRuntime.ts` emits observation-stage `memory_write` events | Initial |
| Memory stream | Chronological natural-language record of experiences | `MemoryRecord` stream exists inside deterministic generator; not yet persisted across runs | Initial |
| Retrieval | Dynamic memory retrieval by relevance, importance, recency | `retrieveMemories` scores and records retrieval evidence in event metadata | Initial |
| Reflection | Higher-level synthesis from memories | Generator emits reflection-stage `thinking` events with source memory IDs | Initial |
| Planning | Higher-level plans decomposed into actions | Generator emits planning-stage `decision` events with `planStep` metadata | Initial |
| Action/conversation | Agents act, talk, coordinate | Generator emits `handoff`, `message`, `tool_call`, and `done` events through the existing projection path | Partial |
| Emergent social behavior | Information spreads and coordination emerges from agent interaction over time | Current cognitive run is deterministic and authored, not autonomous or emergent | Missing |
| LLM behavior generation | LLM produces observations/reflections/plans/actions | Not implemented; deterministic generator is a scaffold for testable event shape | Missing |
| Persistent world/memory | Memory survives across simulation days | Not implemented beyond committed fixtures and evidence | Missing |
| Many agents | Reference environment used 25 agents | Current fixture uses 5 agents | Missing |
| Human intervention | User can inject natural-language changes into the town | JSONL/WebSocket import paths exist, but no live natural-language intervention loop | Missing |
| Evaluation | Believability and ablation evidence | Local type/test/build/Playwright evidence exists; no believability evaluation | Missing |

## Current Implementation Slice

The current slice adds deterministic cognitive evidence:

- `src/events/generativeRuntime.ts`
  - `MemoryRecord`
  - `scoreMemoryRecord`
  - `retrieveMemories`
  - `generateSmallvilleCognitiveRun`
  - `mockSmallvilleCognitiveRun`
- UI source: `Cognitive`
- Metadata stages:
  - `observation`
  - `retrieval`
  - `reflection`
  - `planning`
  - `action`
  - `conversation`
  - `closure`

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
- the existing town projection can render the run without source-specific
  renderer branches
- docs and evidence state that full Stanford parity is still incomplete

This slice cannot claim:

- autonomous social emergence
- persistent agent memory across sessions
- LLM-generated behavior
- 25-agent-scale simulation
- final Stanford Smallville parity

## Next Real Gap

The next meaningful move is not more labels. It is one of:

- persist the memory stream across imported runs
- add a natural-language intervention adapter that becomes `AgentEvent`
- add an LLM-backed reflection/planning adapter behind the same deterministic
  event contract
- add relationship state as derived projection evidence, not renderer-owned
  state
- scale from 5 agents to a 25-agent fixture and profile replay/rendering
