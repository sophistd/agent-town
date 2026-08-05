# Next Phase

Agent Town v0.5 proves the core projection claim:

```text
External source -> Adapter -> AgentEvent -> WorldState -> projection views
```

The next phase should not start by adding visual polish everywhere. It should
choose the highest-risk product question and keep the AgentEvent boundary
intact.

## Recommended Sequence

1. First-run onboarding UI

   Add a small in-app onboarding surface that states:

   ```text
   This town is not a game simulation. It is a projection of agent runtime
   events.
   ```

   Keep the copy close to the current shell, not as a marketing landing page.

2. Stress-run source switcher

   Let the operator load the 200-event fixture from the UI, then add a direct
   evidence screenshot for dense Timeline and Detail inspection.

3. Timeline filtering

   Add filters for blocked, error, tool, memory, handoff, and done events.
   Filtering should affect inspection only; it must not rewrite replay state.

4. Cognitive runtime hardening

   The deterministic `Cognitive`, `Social day`, `Routine day`,
   `Adaptive routine`, `Intervention`, `Memory`, `Memory plan`, and `LLM plan` sources now prove the event
   shape for observation, memory retrieval, reflection, planning, social
   diffusion, routine scheduling, deterministic routine-conflict resolution,
   adapter-produced routine revision from observation and memory evidence,
   natural-language intervention, durable memory recall, agent-addressable
   memory planning, model-planner contract parsing/quarantine, OpenAI Responses
   provider-boundary request/parse coverage with agent-addressable retrieval
   evidence, replay-derived relationship state, dedicated Graph View
   inspection, structural Smallville capability/ablation evaluation, deterministic
   external runtime ticks, bounded world-clock scheduler ticks, scheduler
   checkpoint/resume evidence, supervised elapsed-time scheduler evidence, and
   action at 25-agent scale. The next
   Smallville-oriented runtime session should choose
   exactly one of:

   - run and evidence a real provider-backed LLM call through the existing
     planner boundary, with keys kept out of browser code and deterministic
     fixtures preserved for tests, using the world-memory provider-loop request
     evidence
   - turn adaptive routine revision into provider-backed planning while
     preserving parser quarantine and replay validation
   - run and evidence a live provider-backed call through the external runtime
     stream or `/provider-loop` route, without letting HTTP/provider state
     bypass `AgentEvent`
   - run and evidence a live provider-backed call through the resumable
     scheduler loop while keeping each tick replayable as canonical events
   - extend the resumable scheduler into a longer observed runtime window with
     pause/resume, memory-continuity checks, and stronger wall-clock evidence
   - back the human-review Smallville rubric with a provider-backed benchmark,
     external reviewer study, or dedicated evaluation dashboard
   - profile replay/rendering for 25-agent and larger cognitive/routine
     fixtures

   Do not let the LLM, adapter, or renderer bypass `AgentEvent`.

5. Dedicated Memory view

   Graph View now exists for replay-derived relationship inspection, filtering,
   and evidence jumps. The next projection-view candidate is Memory: promote
   durable memory records, recall evidence, and agent-addressable retrieval
   scores into a dedicated Memory view only after the server/provider boundary
   can make it clear whether records came from browser storage, file-backed
   runtime ingestion, HTTP server ingestion, JSONL provider-loop sender runs,
   live HTTP provider-loop sender runs, Provider HTTP workbench imports,
   external runtime stream ticks, bounded scheduler ticks, scheduler
   checkpoint/resume runs, supervised elapsed-time scheduler windows,
   provider-loop request construction, or provider-backed planning.

6. Runtime adapter hardening

   Expand source-specific adapters for OpenTelemetry, Codex-style logs, Claude
   Code-style events, Langfuse, or other sources. Keep quarantine behavior
   source-local and keep renderer branches source-agnostic.

7. Pixel-town fidelity polish

   The project now has a project-authored Tiled-compatible map, terrain tileset,
   agent sprite sheet, building sprite sheet, and baked pixel-town background.
   The next visual session should deepen fidelity with more tile variation,
   interiors, animated agent poses, and denser prop placement. Choose a
   third-party pack only after license, attribution, commercial-use, and fallback
   behavior are recorded.

8. Performance profiling

   Add browser frame-rate, memory, and canvas draw-call evidence once the UI
   can load the stress fixture directly.

## Do Not Do Next

- Do not turn the town into an autonomous simulation.
- Do not let Phaser own runtime facts.
- Do not bypass AgentEvent for UI convenience.
- Do not introduce external art before license and fallback behavior are clear.
- Do not combine onboarding, filtering, graph tabs, adapter hardening, and
  tileset/sprite polish in one uncontrolled change.

## Acceptance Shape For The Next Milestone

Each next task should still map to one Notion session and one Linear issue.

Required evidence should include:

- the specific product question being answered
- the files allowed for the session
- targeted command output
- screenshot or recording if the change is visual
- boundary self-check for `AgentEvent -> WorldState -> projection views`
- known limitations and the next unblocked task
