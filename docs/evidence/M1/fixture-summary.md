# M1 Fixture Summary

S05 creates deterministic fixtures for the event engine before reducer behavior,
renderer behavior, adapters, or external assets exist.

## Files

| File | Count | Purpose |
| --- | ---: | --- |
| `src/events/mockEvents.ts` | 25 | happy-path product story |
| `src/events/mockFailureRun.ts` | 30 | blocked/error/repair/done story |
| `src/events/mockStressRun.ts` | 200 | stress replay and density input |
| `src/events/invalidEvents.ts` | 11 | malformed and semantic invalid examples |

## Demo Story

The happy path follows a multi-agent Agent Town build run:

1. Planner decomposes the task in Town Hall.
2. Researcher reads memory and searches docs in Library.
3. Coder creates scaffold artifacts in Workshop.
4. Reviewer checks boundaries in Review Room and blocks on missing fixture story.
5. Planner routes the fixture story to the next session.
6. Memory records the source-of-truth boundary in Archive.
7. Planner closes the run in Square.

The failure path focuses on an event-ordering bug:

1. Coder detects duplicate sequence order.
2. Error and blocked states are emitted.
3. Planner decides sequence is canonical replay order.
4. Coder repairs the fixture.
5. Memory saves the policy.
6. Reviewer approves and Planner completes the run.

## Event Type Coverage

| Event type | Happy | Failure | Stress |
| --- | --- | --- | --- |
| thinking | yes | yes | yes |
| message | yes | yes | yes |
| tool_call | yes | yes | yes |
| handoff | yes | yes | yes |
| memory_read | yes | yes | yes |
| memory_write | yes | yes | yes |
| decision | yes | yes | yes |
| blocked | yes | yes | yes |
| error | no | yes | yes |
| done | yes | yes | yes |

## Agent Coverage

| Agent role | Happy | Failure | Stress |
| --- | --- | --- | --- |
| planner | yes | yes | yes |
| researcher | yes | yes | yes |
| coder | yes | yes | yes |
| reviewer | yes | yes | yes |
| memory | yes | yes | yes |

## Location Coverage

| Location | Covered |
| --- | --- |
| town_hall | yes |
| library | yes |
| workshop | yes |
| archive | yes |
| review_room | yes |
| dispatch_board | yes |
| square | yes |

## Determinism Notes

- IDs are deterministic prefixes plus zero-padded sequence numbers.
- Timestamps are derived from fixed base timestamps and sequence numbers.
- Stress fixture uses deterministic `Array.from` cycles, not randomness.
- No `Date.now()` or `Math.random()` is used.
- Invalid examples are typed as `unknown` inputs and do not pretend to satisfy
  `AgentEvent`.

## Scope Guard

S05 does not implement reducer, selectors, validators, Phaser rendering, runtime
adapters, UI behavior, or external assets.
