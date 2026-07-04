# S10 Timeline Controls Evidence

Session: S10 — playback store, timeline, and deterministic replay controls

## Scope

- Added playback store for cursor, play/pause, previous, next, and jump.
- Replaced the bottom placeholder with a real Timeline component.
- Kept `replay(events, cursor)` as the only path for reconstructing `WorldState`.
- Preserved distinction between current playback event and selected event.
- Did not implement adapters, Tiled map, graph view, or product polish beyond the
  small layout height/label adjustment needed for the M3 timeline surface.

## Browser Evidence

Local dev server:

```plain text
http://localhost:5173/
```

Screenshot:

```plain text
docs/evidence/M3/timeline-controls.png
```

CDP verification:

```json
{
  "health": {
    "href": "http://localhost:5173/",
    "canvasCount": 1,
    "hasTimeline": true,
    "hasM3": true
  },
  "initial": {
    "playbackBlock": "Playback\\n\\nCurrent event: happy-000\\nSelected event: none",
    "timelineCursor": "1 / 25 · happy-000"
  },
  "afterNext": {
    "playbackBlock": "Playback\\n\\nCurrent event: happy-001\\nSelected event: none",
    "timelineCursor": "2 / 25 · happy-001"
  },
  "afterJump": {
    "playbackBlock": "Playback\\n\\nCurrent event: happy-002\\nSelected event: happy-002",
    "timelineCursor": "3 / 25 · happy-002"
  },
  "duringPlay": {
    "playbackBlock": "Playback\\n\\nCurrent event: happy-003\\nSelected event: happy-002",
    "timelineCursor": "4 / 25 · happy-003",
    "hasPause": true
  },
  "afterPause": {
    "playbackBlock": "Playback\\n\\nCurrent event: happy-003\\nSelected event: happy-002",
    "hasPlay": true
  }
}
```

## Acceptance Mapping

- Timeline lists every event in chronological order: visible event cards show
  `#sequence`, timestamp, agent, type, and summary.
- Previous/next work: CDP `Next` moved current event from `happy-000` to
  `happy-001`.
- Jump works: clicking `#02` moved current event and selected event to
  `happy-002`.
- Play/pause works: `Play` advanced current event from `happy-002` to
  `happy-003`; selected event remained `happy-002`.
- Timeline cursor and Town View stayed synchronized: screenshot shows
  `3 / 25 · happy-002`, Town canvas cursor `2 · happy-002`, and DetailPanel
  current event `happy-002`.
- Current playback event and selected event are distinguishable: during playback,
  current event became `happy-003` while selected event stayed `happy-002`.

## Boundary Scans

Timeline/playback did not add adapter or storage coupling:

```plain text
rg -n "jsonl|websocket|adapter|fetch\(|localStorage|sessionStorage" src/state/playbackStore.ts src/ui/Timeline.tsx src/ui/App.tsx
```

No matches.

Events layer stayed renderer-free:

```plain text
rg -n "from ['\"](react|react-dom|phaser)|document\.|window\.|HTMLElement|HTMLCanvasElement|CanvasRenderingContext2D" src/events
```

No matches.
