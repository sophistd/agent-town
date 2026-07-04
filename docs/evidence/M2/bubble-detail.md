# S09 Bubble, Edge, And Detail Evidence

Session: S09 — speech bubbles, handoff edges, and basic detail selection

## Scope

- Render speech/tool/memory/error/done bubbles from `WorldState.visibleBubbles`.
- Render handoff/message/review edges from `WorldState.edges`.
- Add `selectionStore` for selected agent and selected event.
- Add DetailPanel v1 that shows current playback event separately from selected event.
- Keep full timeline controls, adapters, Tiled, and external assets out of scope.

## Scope Note

`src/ui/App.tsx` was also touched to mount `DetailPanel` and wire timeline selection
to the same selected event store. This is a small necessary integration point for
the S09 selection evidence; it does not add full timeline controls.

## Screenshot Targets

```plain text
docs/evidence/M2/bubble-detail.png
docs/evidence/M2/handoff-edge.png
```

## Selection Contract

- Clicking a Phaser-rendered bubble calls `selectEvent(bubble.eventId, agent.agentId)`.
- Clicking a Phaser-rendered agent calls `selectAgent(agent.agentId)`.
- Clicking a bottom timeline item also selects the corresponding original `AgentEvent`.
- DetailPanel looks up selected event by id from the original `mockEvents` array. It prints the raw `AgentEvent` JSON instead of reconstructed or invented fields.

## Command Evidence

- `pnpm typecheck`
  - passed
- `pnpm test`
  - passed: 4 test files, 15 tests
- `pnpm build`
  - passed
  - Vite warning remains: Phaser bundle chunk is larger than 500 kB after minification.

## Browser Evidence

Local dev server:

```plain text
pnpm dev -- --host 127.0.0.1 --port 5179
```

Final verification used `http://localhost:5173/`.

CDP verification result:

```json
{
  "href": "http://localhost:5173/",
  "canvasCount": 1,
  "bubbleClick": {
    "candidate": "planner-done",
    "selected": "happy-024",
    "type": "done",
    "agent": "Planner",
    "jsonId": "happy-024",
    "hasRawJson": true
  },
  "agentClicks": [
    {
      "candidate": "coder-zone",
      "selectedAgent": "Coder"
    },
    {
      "candidate": "reviewer-zone",
      "selectedAgent": "Reviewer"
    }
  ],
  "screenshots": [
    "docs/evidence/M2/handoff-edge.png",
    "docs/evidence/M2/bubble-detail.png"
  ]
}
```

The screenshot `bubble-detail.png` shows current playback event `happy-024`,
selected event `happy-024`, selected agent `Planner`, and raw selected event JSON.
The screenshot `handoff-edge.png` shows handoff edges, message/tool/memory bubbles,
and the status marker legend.

## Boundary Scans

Events layer stayed renderer-free:

```plain text
rg -n "from ['\"](react|react-dom|phaser)|document\.|window\.|HTMLElement|HTMLCanvasElement|CanvasRenderingContext2D" src/events
```

No matches.

Game/UI projection stayed adapter/storage-free:

```plain text
rg -n "jsonl|websocket|adapter|fetch\(|localStorage|sessionStorage" src/game src/ui/TownCanvas.tsx src/state/selectionStore.ts
```

No matches.
