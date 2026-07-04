# S07 Phaser Lifecycle Evidence

Session: S07 — React / Phaser lifecycle boundary

## Scope

- Added `phaser` as a runtime dependency because MDL-137 requires a real Phaser canvas.
- Added `src/ui/Layout.tsx` for the M2 app shell: left Session/Agents, center TownCanvas, right Detail, bottom Timeline placeholder.
- Added `src/ui/TownCanvas.tsx` as the only React component that creates, updates, and destroys the Phaser game instance.
- Added `src/game/createPhaserGame.ts` as the single create/update/destroy boundary.
- Added `src/game/AgentTownScene.ts` as a placeholder scene that consumes `WorldState` through the Phaser registry.

## React To Phaser Boundary

React owns:

- `cursor`
- event list
- replayed `WorldState`
- selected event / selected agent facts
- detail and timeline UI

Phaser owns:

- the mounted canvas
- disposable scene objects
- placeholder town background
- rendering text derived from `WorldState`

Phaser does not create business facts. It receives the current `WorldState` from React through `updatePhaserWorldState()`, stores that object in the Phaser registry, and the scene renders from that projection.

## Lifecycle Checks

- `TownCanvas` creates the game only when `gameRef.current` is `null`.
- `TownCanvas` calls `destroyPhaserGame(game)` in the effect cleanup.
- Browser rerender check clicked timeline items `00`, `04`, and `08`; canvas count remained `1`.
- Screenshot captured: `docs/evidence/M2/s07-mounted-canvas.png`.

```plain text
Playwright geometry:
canvasCount: 1
host: 794 x 515.1875
canvas: 794 x 446.625
intrinsic canvas: 960 x 540
bodyHeight: 920
```

```plain text
Rerender check:
initialCanvasCount: 1
afterClicksCanvasCount: 1
```

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
   Start at  04:48:41
   Duration  633ms (transform 122ms, setup 0ms, collect 240ms, tests 12ms, environment 1.35s, prepare 204ms)
```

```plain text
$ pnpm build
$ tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json && vite build
vite v7.3.6 building client environment for production...
transforming...
✓ 39 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                    0.32 kB │ gzip:   0.23 kB
dist/assets/index-BQftJN2d.js  1,602.10 kB │ gzip: 439.61 kB

(!) Some chunks are larger than 500 kB after minification.
✓ built in 1.79s
```

The large chunk warning is expected for the first Phaser embed. S07 records it as a later performance/code-splitting consideration, not a lifecycle failure.

Build output `dist/` was removed after verification. The temporary Vite server on `127.0.0.1:5177` was stopped after screenshot and rerender checks.

## Boundary Scan

```plain text
$ rg -n "from ['\"](react|react-dom)|document\.|window\.|HTMLElement|HTMLCanvasElement|CanvasRenderingContext2D" src/events
no matches
```

```plain text
$ rg -n "jsonl|websocket|adapter|fetch\\(|localStorage|sessionStorage" src/game src/ui/TownCanvas.tsx
no matches
```

## S07 Result

S08 can render locations and agents inside the mounted Phaser scene without changing lifecycle architecture. The scene already consumes `WorldState`; S08 only needs to replace the placeholder drawing with location and agent render helpers.
