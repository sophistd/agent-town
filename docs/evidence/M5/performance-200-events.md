# S15 200-Event Performance Evidence

Session: S15 - final README, demo script, and evidence package
Date: 2026-07-04
Reviewer: Codex

## Scope

This note verifies the M5 requirement that a 200-event stress run remains usable
for the v0.5 prototype review.

The stress fixture is `src/events/mockStressRun.ts`.

## Fixture Shape

- Event count: 200
- Agents: Planner, Researcher, Coder, Reviewer, Memory
- Event cycle: thinking, message, tool_call, handoff, memory_read,
  memory_write, decision, blocked, error, done
- Location cycle: Town Hall, Library, Workshop, Archive, Review Room,
  Dispatch Board, Square
- Metadata source: `mock`

## Automated Check

Command:

```plain text
pnpm test -- src/tests/replay.test.ts --reporter=verbose
```

Result:

```plain text
passed
```

Relevant output:

```plain text
Test Files  6 passed (6)
Tests       29 passed (29)
Duration    579ms
src/tests/replay.test.ts (5 tests) 6ms
```

The replay test includes:

```plain text
keeps the 200-event stress replay deterministic and complete
```

That test replays `mockStressRun` to the final cursor and verifies:

- `runSummary.totalEvents` is 200
- repeated replay at the same cursor reconstructs the same `WorldState`

## Manual Usability Evidence

The current M5 visual baseline screenshot is:

```plain text
docs/evidence/M5/visual-layout.png
```

That screenshot shows the same projection shell used by replay and adapter
sources: town canvas, stable zones, agent status, bubbles, handoff edges, run
summary, Import Source, and Timeline.

## Interpretation

The evidence supports this M5 claim:

```text
The 200-event stress fixture remains deterministic and replayable in the current
runtime projection pipeline.
```

This is not a browser frame-rate benchmark. It is a deterministic replay and
operator-usability check for the current v0.5 review surface.

## Known Limits

- The UI does not yet include a dedicated stress-run source switcher.
- Dense timeline filtering is limited to existing Timeline, run summary, and
  Detail inspection.
- Browser frame-rate, memory use, and canvas draw-call profiling remain future
  work if performance becomes the next product risk.

## Acceptance Self-Check

- [x] 200-event fixture exists.
- [x] 200-event replay is covered by automated tests.
- [x] Replay remains deterministic for the final cursor.
- [x] M5 visual baseline screenshot is referenced.
- [x] Performance claim is scoped honestly to replay/usability, not FPS.
