# Metrics And Acceptance Measurement

This document turns Agent Town acceptance into measurable evidence. Milestones
do not pass because the interface looks pleasant. They pass when the right
uncertainty is reduced with artifacts, commands, screenshots, recordings, or
reviewable checklists.

Source: https://app.notion.com/p/393acb4bb6e681e39b1ae49a477f27d7

## North Star

Time to understand current run state.

A new viewer should be able to inspect a demo run and answer at least three of
these four questions within 10 seconds:

- Who is the active agent?
- What phase is the current task in?
- Is there a blocked or error state?
- Who was involved in the most recent handoff or message?

Evidence: self-test recording, screenshot set, or manual checklist.

## Product Comprehension Metrics

| Metric | Target | Evidence |
| --- | ---: | --- |
| Active agent recognition | 5 sec or less | user test or self-test recording |
| Current phase recognition | 10 sec or less | user test or self-test recording |
| Handoff recognition | 10 sec or less | screenshot with edge or bubble |
| Tool location recognition | 10 sec or less | screenshot with agent at building |
| Bubble to detail traceability | 100% clickable | manual checklist |
| Misread as life simulation | 0 in first-run copy review | copy review note |

## Debuggability Metrics

| Metric | Target | Evidence |
| --- | ---: | --- |
| Jump to first error | 1 click or less from summary | screen recording |
| Find event before error | 2 clicks or less | screen recording |
| Selected bubble maps to raw event | 100% | manual checklist |
| Timeline cursor sync | 100% | replay test or manual test |
| Replay determinism | 100% | unit test |
| Blocked/error visible persistence | 100% | screenshot or visual checklist |

## Engineering Correctness Metrics

| Metric | Target | Evidence |
| --- | --- | --- |
| TypeScript strict compile | pass | `pnpm typecheck` |
| Unit tests | pass | `pnpm test` |
| Production build | pass | `pnpm build` |
| Reducer purity | no DOM, React, Phaser, or canvas imports | code review or test |
| Unknown event safety | no crash | unit test |
| Invalid input quarantine | no crash | adapter test |
| Event type visual coverage | 10/10 event types | mapping table |
| Location coverage | 7/7 locations | screenshot or test |
| Agent coverage | 5/5 default agents | screenshot or test |

## Rendering And Performance Metrics

MVP performance is measured by debug readability, not game polish.

| Metric | M3 target | M5 target | Evidence |
| --- | ---: | ---: | --- |
| 25-event mock run readable | pass | pass | screen recording |
| 200-event stress replay | pass | pass | performance note |
| Replay 200 events through reducer | under 100 ms | under 50 ms if optimized | benchmark note |
| UI remains interactive during playback | no visible freeze | no visible freeze | manual recording |
| Bubble density | current plus persistent errors only | configurable or filterable | screenshot |
| Timeline scroll usability | 200 events usable | 500 events planned | manual test |

## Codex Execution Metrics

| Metric | Target | Evidence |
| --- | ---: | --- |
| One Codex task maps to one Linear issue | 100% | Linear link in final response or PR |
| Touched file scope respected | 100% | diff review |
| Required commands run | 100% best effort | final response and evidence note |
| Tests pass before merge | 100% after scaffold exists | terminal output |
| Docs updated when behavior changes | 100% | diff review |
| No architecture boundary violation | 100% | code review |
| Known limitations reported | 100% | final response |

## Event Coverage Matrix

Completion target: 10/10 event types implemented by M3.

| Event type | Reducer behavior | Town visual | Timeline label | Detail fields | Test required |
| --- | --- | --- | --- | --- | --- |
| `thinking` | status thinking | thought bubble | yes | content, summary | yes |
| `message` | edge and bubble | speech bubble | yes | targetAgentId | yes |
| `tool_call` | route location | tool bubble | yes | toolName, toolInput | yes |
| `handoff` | source-target edge | handoff marker | yes | targetAgentId | yes |
| `memory_read` | archive route | memory marker | yes | metadata, source | yes |
| `memory_write` | archive route | write marker | yes | content, artifact | yes |
| `decision` | town hall route | decision marker | yes | content | yes |
| `blocked` | status blocked | persistent marker | yes | reason, content | yes |
| `error` | status error | persistent marker | yes | error content | yes |
| `done` | status done | square/check | yes | task or run result | yes |

## Milestone Metric Gates

### M0

- Object model is complete: Run, Task, Agent, AgentEvent, Conversation,
  ToolCall, MemoryAction, Artifact, WorldState, TimelineCursor.
- AgentEvent schema draft includes required, optional, metrics, metadata, and
  source fields.
- Non-goals are documented.
- Codex can start M1 without product clarification.

### M1

- Happy-path fixture has 25+ events.
- Failure fixture has 30+ events.
- Stress fixture has 200+ events.
- Invalid fixture has 10+ invalid events.
- Reducer deterministic tests pass.
- Unknown event safety test passes.

### M2

- 7 locations render.
- 5 default agents render.
- 10 event types have visual mapping, even if some are minimal.
- Bubble click to Detail Panel works.
- Handoff edge is visible.

### M3

- Timeline shows every event.
- Play, pause, previous, next, and jump controls work.
- First error jump is 1 click or less.
- Error previous context is 2 clicks or less.
- Run summary counts match selectors.
- Selected event and playback current event are distinguishable.

### M4

- JSONL import works.
- WebSocket ingest works.
- Invalid events are quarantined.
- Source metadata is visible in Detail Panel.
- Renderer has no source-specific branch.

### M5

- Demo recording exists.
- README setup works from a clean clone.
- 200-event stress run remains usable.
- Asset license state is documented.
- First-run copy prevents game-simulation misunderstanding.

## Evidence Folder Convention

Evidence belongs under `docs/evidence/`:

```text
docs/evidence/
  M1/
    test-output.md
    reducer-snapshot.md
  M2/
    town-view.png
    bubble-detail.png
    comprehension-checklist.md
  M3/
    replay-recording.mp4
    error-jump.gif
    debuggability-checklist.md
  M4/
    jsonl-import-recording.mp4
    invalid-event-quarantine.md
  M5/
    final-demo.mp4
    screenshots/
    performance-200-events.md
```

## Acceptance Philosophy

Accept a milestone only if evidence reduces uncertainty about one of these
layers:

```text
Event model -> State reconstruction -> Spatial projection -> Replay/debugging
-> Runtime ingest -> Product demo
```
