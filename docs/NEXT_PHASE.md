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

   The deterministic `Cognitive`, `Social day`, `Intervention`, and `Memory`
   sources now prove the event shape for observation, memory retrieval,
   reflection, planning, social diffusion, natural-language intervention,
   durable memory recall, and action at 25-agent scale. The next
   Smallville-oriented runtime session should choose exactly one of:

   - add an LLM-backed reflection/planning adapter behind the same event
     contract
   - make persistent memory agent-addressable so future plans can retrieve by
     persona, query, importance, and recency across browser sessions
   - move durable memory from browser-local storage to a real world-state
     backing store
   - profile replay/rendering for 25-agent and larger social fixtures

   Do not let the LLM, adapter, or renderer bypass `AgentEvent`.

5. Dedicated Graph and Memory views

   Promote the existing projection data into separate views only after the
   demo proves which questions reviewers ask most often.

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
