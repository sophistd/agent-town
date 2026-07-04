# S10 Replay Test Output

Session: S10 — playback store, timeline, and deterministic replay controls

## Commands

```plain text
pnpm typecheck
```

Result: passed.

```plain text
pnpm test
```

Result:

```plain text
Test Files  5 passed (5)
Tests       20 passed (20)
```

```plain text
pnpm build
```

Result: passed.

Known warning:

```plain text
Some chunks are larger than 500 kB after minification.
```

The warning is caused by the Phaser runtime bundle and is not a replay
determinism failure.

## Replay Coverage

`src/tests/replay.test.ts` covers:

- playback cursor clamping
- current playback event lookup from cursor
- repeated jumps to the same index reconstructing identical `WorldState`
- happy fixture replay
- failure fixture replay at error and repair checkpoints
- 200-event stress fixture replay

## Determinism Note

Timeline playback does not maintain an independent state model. The React app
passes the current cursor into:

```plain text
replay(mockEvents, playback.cursor)
```

Town View then receives the resulting `WorldState`. This keeps playback cursor,
canvas projection, and current event reconstruction on the reducer path.
