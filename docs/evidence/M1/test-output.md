# M1 S06 Test Output

Session: S06 — reducer, selectors, routing, validators, determinism tests

## Scope

- Implemented event-only replay/projection logic in `src/events/reducer.ts`.
- Implemented single routing map in `src/events/routing.ts`.
- Implemented event selectors in `src/events/selectors.ts`.
- Implemented validator/quarantine handling in `src/events/validators.ts`.
- Added reducer, routing, and validator tests under `src/tests/`.
- Added the M1 dev print page in `src/ui/App.tsx` so every cursor can show its event and derived `WorldState`.

## Command Evidence

Command output captured after implementation:

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
   Start at  04:36:40
   Duration  552ms (transform 93ms, setup 0ms, collect 161ms, tests 12ms, environment 993ms, prepare 211ms)
```

```plain text
$ pnpm build
$ tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json && vite build
vite v7.3.6 building client environment for production...
transforming...
✓ 34 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  0.32 kB │ gzip:  0.23 kB
dist/assets/index-DqoPFogq.js  209.08 kB │ gzip: 65.54 kB
✓ built in 413ms
```

Build output `dist/` was removed after verification.

```plain text
$ pnpm exec vite --host 127.0.0.1 --port 5176
VITE v7.3.6 ready in 139 ms
Local: http://127.0.0.1:5176/

$ curl -sS -I http://127.0.0.1:5176/
HTTP/1.1 200 OK
Content-Type: text/html
```

The temporary dev server was stopped after the smoke check.

## Boundary Scan

```plain text
$ rg -n "from ['\"](react|react-dom|phaser)|document\.|window\.|HTMLElement|HTMLCanvasElement|CanvasRenderingContext2D" src/events
no matches
```

```plain text
$ rg -n "Date\.now|Math\.random|crypto\.randomUUID|new Date\(\)" src/events
no matches
```

## Purity And Boundary Notes

- Reducer inputs are `WorldState` and `AgentEvent`; output is a newly constructed `WorldState`.
- The reducer, routing, selectors, and validators do not import DOM, React, Phaser, adapters, browser globals, `Date.now()`, or `Math.random()`.
- `replay()` sorts a copied event array by `sequence`; it never mutates the input array.
- Unknown event types are reduced into an explicit `unsupported_event_type` warning instead of crashing.
- Invalid inputs are captured as `quarantinedEvents` by the validator path and omitted from playable event replay.
