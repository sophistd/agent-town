# Demo Script

Purpose: package the v0.5 prototype for product-direction review.

Audience: a reviewer who needs to understand Agent Town as a runtime-event
projection UI, not as an autonomous life-simulation game.

## First-Run Copy

Read this before touching the controls:

```text
This town is not a game simulation. It is a projection of agent runtime events.
The runtime facts come from AgentEvent. Town, Timeline, Detail, Graph, and
Memory views are projections.
```

Chinese operator copy:

```text
这个小镇不是自主生命模拟游戏。它是 Agent 运行事件的投影。
事实来自 AgentEvent；小镇、时间线、详情、关系和记忆视图只是投影。
```

## Setup

```bash
pnpm dev
```

Open the local Vite URL printed by the command.

## Story Spine

The demo story is a task moving through a multi-agent runtime:

```text
user task -> planning -> research -> coding -> review -> memory -> done
```

Use the default mock failure run. It intentionally includes error, blocked,
repair, review, memory write, and done checkpoints so the reviewer can inspect
the runtime path instead of only watching a happy-path animation.

## Talk Track

1. Start with the projection claim.

   "Agent Town is not trying to simulate agent life. It shows what already
   happened in a runtime by projecting AgentEvent into town, timeline, detail,
   summary, and edge views."

2. Planning.

   Select the first events in Timeline. Show Planner in Town Hall. Point out
   that the status, location, and current bubble come from event fields and
   reducer output.

3. Research.

   Jump to Researcher events. Show Library and Archive movement. Explain that
   research and memory reads are separate event types, so they can be measured
   and filtered later.

4. Coding.

   Jump to Coder tool-call events in Workshop. Open Detail and show `toolName`,
   `toolInput`, and `toolOutputSummary`.

5. Error and blocked state.

   Jump to `failure-008` and `failure-009`. Show the Review Room or Dispatch
   Board routing, blocked/error status markers, Timeline position, and run
   summary counts.

6. Repair.

   Jump to the repair events after Planner chooses that sequence order wins.
   Explain that the town is showing the repair path, not hiding the failure.

7. Review.

   Jump to Reviewer tool-call and message events. Show the edge between agents
   and the selected-event Detail fields.

8. Memory.

   Jump to the memory write. Show Archive routing and explain that memory
   action is a first-class event instead of an invisible side effect.

9. Done.

   Jump to the final event. Show Square routing, done marker, and final run
   summary.

10. Native JSONL import.

   Click `JSONL`. The sample imports canonical events from the text area.
   Explain that adapter output returns to the same `AgentEvent -> WorldState`
   path.

11. WebSocket sample.

   Click `WS sample`. Select the second event and show `websocket_ingest`,
   `trace-websocket-sample`, and `metadata.source`. Explain that source-shaped
   input is normalized before projection.

12. Quarantine expectation.

   If a bad input is tested, show that accepted events continue to replay while
   invalid events are quarantined. Do not let invalid input become a renderer
   branch.

## Reviewer Checks

- Can the reviewer state why this is a runtime projection and not a game sim?
- Can the reviewer follow task -> planning -> research -> coding -> review ->
  memory -> done?
- Can the reviewer locate where a blocked or error event happened?
- Can the reviewer inspect a selected event without reading source code?
- Can the reviewer see that JSONL and WebSocket paths use the same projection
  pipeline?
- Can the reviewer name the current known limitation: generated placeholder
  visuals are deliberate until visual polish becomes the highest-risk work?

## Evidence To Reference

- `docs/evidence/M5/visual-layout.png`
- `docs/evidence/M5/visual-layout.md`
- `docs/evidence/M5/performance-200-events.md`
- `docs/evidence/M5/final-demo-notes.md`
- `docs/evidence/M4/source-switcher.png`
