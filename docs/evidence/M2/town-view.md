# S08 Town View Evidence

Session: S08 — locations, agents, and status markers

## Scope

- Render 7 locations inside the mounted Phaser scene.
- Render 5 default agents from `WorldState`: Planner, Researcher, Coder, Reviewer, Memory.
- Render stable labels, role colors, selected marker, and status markers.
- Keep routing canonical in `src/events/routing.ts`.
- Use placeholder shapes only; no external art assets, Tiled map, adapters, bubbles, or handoff edges.

## Screenshot

Screenshot target:

```plain text
docs/evidence/M2/town-view.png
```

Screenshot captured with Playwright at `1440 x 920`.

```plain text
canvasCount: 1
host: 794 x 515.1875
canvas: 794 x 446.625
intrinsic canvas: 960 x 540
bodyHeight: 920
```

The screenshot shows:

- Town Hall
- Library
- Workshop
- Archive
- Review Room
- Dispatch Board
- Square
- Planner
- Researcher
- Coder
- Reviewer
- Memory
- status marker legend

## Command Evidence

```plain text
$ pnpm typecheck
$ tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json
```

```plain text
$ pnpm test
$ vitest run

 RUN  v3.2.6 /Users/ronin/02 Projects/Code/agent 小镇

 ✓ src/tests/scaffold.test.ts (1 test) 1ms
 ✓ src/tests/routing.test.ts (3 tests) 2ms
 ✓ src/tests/validators.test.ts (4 tests) 3ms
 ✓ src/tests/reducer.test.ts (7 tests) 6ms

 Test Files  4 passed (4)
      Tests  15 passed (15)
   Start at  04:53:38
   Duration  444ms (transform 84ms, setup 0ms, collect 141ms, tests 11ms, environment 845ms, prepare 146ms)
```

```plain text
$ pnpm build
$ tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json && vite build
vite v7.3.6 building client environment for production...
transforming...
✓ 42 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                    0.32 kB │ gzip:   0.23 kB
dist/assets/index-D1iV8CLs.js  1,606.15 kB │ gzip: 440.93 kB

(!) Some chunks are larger than 500 kB after minification.
✓ built in 1.66s
```

The large chunk warning remains the known Phaser bundle-size note from S07. S08 does not introduce a new runtime failure.
Build output `dist/` was removed after verification. The temporary Vite server on `127.0.0.1:5178` was stopped after screenshot capture.

```plain text
$ curl -sS -I http://127.0.0.1:5178/
HTTP/1.1 200 OK
```

## Boundary Notes

- Agent positions are derived from `WorldState.agents[*].x/y`.
- `WorldState` positions are derived by replaying `AgentEvent` through `src/events/reducer.ts`, which uses `src/events/routing.ts`.
- Renderer files do not define a second event router.
- `src/game/visualMapping.ts` contains labels and colors only.
- Placeholder shapes are drawn with Phaser graphics; no external art assets or Tiled map were introduced.

## Boundary Scan

```plain text
$ rg -n "from ['\"](react|react-dom|phaser)|document\.|window\.|HTMLElement|HTMLCanvasElement|CanvasRenderingContext2D" src/events
no matches
```

```plain text
$ rg -n "jsonl|websocket|adapter|fetch\\(|localStorage|sessionStorage" src/game src/ui/TownCanvas.tsx
no matches
```
