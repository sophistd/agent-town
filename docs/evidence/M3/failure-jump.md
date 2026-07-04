# M3 Failure Jump Evidence

## Fixture

- Source: `src/events/mockFailureRun.ts`
- Full run summary: 30 events, 5 agents, 3 handoffs, 8 tool calls, 3 memory actions, 2 blocked events, 1 error.
- Failure shortcuts: `failure-009` first blocked, `failure-008` first error, `failure-007` previous context before first error.

## Browser Check

Chrome DevTools Protocol loaded the local Vite app and verified a real rendered canvas plus UI interactions.

```text
Initial:
- canvasCount: 1
- timelineVisible: true
- current event: failure-000
- selected event: none

After clicking First error:
- current event: failure-008
- selected event: failure-008
- current timeline card: #08 / Coder / error / Duplicate sequence
- detail content contains: Ordering check finds two events with sequence 12.
- timelineVisible: true

After clicking Before error:
- current event: failure-007
- selected event: failure-007
- current timeline card: #07 / Coder / tool_call / Run ordering check
- detail tool input contains: {"command":"pnpm test -- ordering"}
- timelineVisible: true
```

## Screenshots

- Failure jump view: `docs/evidence/M3/failure-jump.png`
- Detail field view after previous-context jump: `docs/evidence/M3/detail-panel.png`

## Scope Notes

- `RunSummary` uses AgentEvent-derived selectors and a complete-run replay projection for counts.
- `TownCanvas`, `Timeline`, and `DetailPanel` continue to use the current playback cursor projection.
- The default demo run now uses `mockFailureRun` so the failure shortcut path is visible without adding adapters or invented data.
