# Smallville Supervised Scheduler Elapsed-Time Evidence

Date: 2026-07-10

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation adds a supervised elapsed-time window to the resumable
Smallville scheduler.

The scheduler now accepts `AGENT_TOWN_SCHEDULER_MAX_ELAPSED_MS`. When the
wall-clock window is exhausted, the scheduler stops after the current completed
canonical tick, writes the checkpoint, and records:

```text
supervision.stopReason = "elapsed_time_limit_reached"
```

Elapsed-time supervision is control-plane state only. It does not create,
delete, or reorder runtime facts. Accepted facts still enter through:

```text
Scheduler tick -> canonical AgentEvent batch -> /provider-loop -> WorldState projection
```

## Files Changed

- `src/server/smallvilleAutonomousSchedulerRunner.ts`
- `scripts/smallville-autonomous-scheduler.mjs`
- `src/tests/smallville-autonomous-scheduler-runner.test.ts`
- `README.md`
- `docs/ADAPTER_GUIDE.md`
- `docs/DEMO_SCRIPT.md`
- `docs/EVENT_SCHEMA.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-supervised-scheduler-elapsed.md`
- `docs/evidence/M5/smallville-supervised-scheduler-elapsed-checkpoint.json`
- `docs/evidence/M5/smallville-supervised-scheduler-elapsed-first-summary.json`
- `docs/evidence/M5/smallville-supervised-scheduler-elapsed-resumed-summary.json`
- `docs/evidence/M5/smallville-supervised-scheduler-elapsed-first-events.jsonl`
- `docs/evidence/M5/smallville-supervised-scheduler-elapsed-resumed-events.jsonl`
- `docs/evidence/M5/smallville-supervised-scheduler-elapsed-visual-qa.json`
- `docs/evidence/M5/smallville-supervised-scheduler-elapsed-desktop.png`
- `docs/evidence/M5/smallville-supervised-scheduler-elapsed-desktop-map.png`
- `docs/evidence/M5/smallville-supervised-scheduler-elapsed-mobile.png`
- `docs/evidence/M5/smallville-supervised-scheduler-elapsed-mobile-map.png`

## Acceptance Evidence

- `maxElapsedMs` is validated as a positive integer when supplied.
- The CLI reads `AGENT_TOWN_SCHEDULER_MAX_ELAPSED_MS`.
- Summary output records `supervision.requestedTickCount`,
  `supervision.maxElapsedMs`, `supervision.elapsedMs`, and
  `supervision.stopReason`.
- The elapsed-time stop happens only after at least one completed tick and after
  checkpoint write for the last completed tick.
- Resume starts from the checkpoint's next tick after an elapsed-time stop.
- The same file-backed world-memory store continues accumulating records
  across both elapsed-window invocations.
- Without `OPENAI_API_KEY`, the provider is not called and
  `missing_openai_api_key` remains visible.

## Verification

Commands run:

- `pnpm exec vitest run src/tests/smallville-autonomous-scheduler-runner.test.ts`:
  passed, 1 file / 4 tests.
- `pnpm typecheck`: passed.
- Two-stage elapsed-window package-script smoke: passed.
- `pnpm exec vitest run src/tests/smallville-autonomous-scheduler-runner.test.ts src/tests/smallville-external-runtime-stream-runner.test.ts src/tests/world-memory-provider-loop-runner.test.ts src/tests/world-memory-http-server.test.ts`:
  passed, 4 files / 16 tests.
- `pnpm test`: passed, 20 files / 109 tests.
- `pnpm build`: passed with the existing Phaser/Vite large chunk warning.
- `git diff --check`: passed.
- Browser visual smoke: passed for desktop 1440x960 and mobile 390x844.
- The `develop-web-game` skill's Node Playwright client was attempted, but
  failed before launch because its directory could not resolve the `playwright`
  package. No dependency was installed for this check. Python Playwright was
  already available and was used for the browser smoke instead.

First invocation:

```bash
AGENT_TOWN_WORLD_MEMORY_FILE=/tmp/agent-town-supervised-scheduler-elapsed-memory.json \
AGENT_TOWN_SCHEDULER_CHECKPOINT=docs/evidence/M5/smallville-supervised-scheduler-elapsed-checkpoint.json \
AGENT_TOWN_SCHEDULER_OUTPUT=docs/evidence/M5/smallville-supervised-scheduler-elapsed-first-summary.json \
AGENT_TOWN_SCHEDULER_EVENTS_OUTPUT=docs/evidence/M5/smallville-supervised-scheduler-elapsed-first-events.jsonl \
AGENT_TOWN_SCHEDULER_TICKS=10 \
AGENT_TOWN_SCHEDULER_EVENTS_PER_TICK=8 \
AGENT_TOWN_SCHEDULER_TICK_MINUTES=30 \
AGENT_TOWN_SCHEDULER_TICK_DELAY_MS=20 \
AGENT_TOWN_SCHEDULER_MAX_ELAPSED_MS=55 \
AGENT_TOWN_PROVIDER_LOOP_MAX_AGENTS=3 \
AGENT_TOWN_PROVIDER_LOOP_MAX_MEMORY_RECORDS=12 \
pnpm smallville:scheduler
```

Second invocation:

```bash
AGENT_TOWN_WORLD_MEMORY_FILE=/tmp/agent-town-supervised-scheduler-elapsed-memory.json \
AGENT_TOWN_SCHEDULER_CHECKPOINT=docs/evidence/M5/smallville-supervised-scheduler-elapsed-checkpoint.json \
AGENT_TOWN_SCHEDULER_RESUME=true \
AGENT_TOWN_SCHEDULER_OUTPUT=docs/evidence/M5/smallville-supervised-scheduler-elapsed-resumed-summary.json \
AGENT_TOWN_SCHEDULER_EVENTS_OUTPUT=docs/evidence/M5/smallville-supervised-scheduler-elapsed-resumed-events.jsonl \
AGENT_TOWN_SCHEDULER_TICKS=10 \
AGENT_TOWN_SCHEDULER_TICK_DELAY_MS=20 \
AGENT_TOWN_SCHEDULER_MAX_ELAPSED_MS=55 \
AGENT_TOWN_PROVIDER_LOOP_MAX_AGENTS=3 \
AGENT_TOWN_PROVIDER_LOOP_MAX_MEMORY_RECORDS=12 \
pnpm smallville:scheduler
```

First-run smoke output:

- Requested tick count: 10.
- Actual completed tick count: 2.
- Stop reason: `elapsed_time_limit_reached`.
- Elapsed time: 60 ms.
- Start tick index: 0.
- Tick indexes: 0, 1.
- Phases: `morning_routine`, `work_coordination`.
- Emitted events: 16.
- Event log lines: 16.
- Final persisted memory records: 9.
- Provider events: 0 because no local/server API key was configured.

Resumed-run smoke output:

- Requested tick count: 10.
- Resume requested: true.
- Resumed: true.
- Previous completed tick count: 2.
- Start tick index: 2.
- Actual completed tick count: 1.
- Stop reason: `elapsed_time_limit_reached`.
- Elapsed time: 55 ms.
- Tick indexes: 2.
- Phases: `midday_social`.
- Emitted events: 8.
- Event log lines: 8.
- First resumed event sequence: 16.
- Final persisted memory records: 13.
- Provider events: 0 because no local/server API key was configured.

Final checkpoint:

- `completedTickCount: 3`.
- `nextTickIndex: 3`.
- `lastEventSequence: 23`.
- `lastCompletedTick.tickIndex: 2`.

Continuity evidence:

- The first process requested 10 ticks but stopped after 2 completed ticks due
  to the elapsed-time window.
- The first process wrote a checkpoint with next tick 2.
- The second process resumed at tick 2 instead of restarting at tick 0.
- Event sequence continued from 16 in the resumed run.
- Persisted memory grew from 9 records after the first invocation to 13 records
  after the resumed invocation.
- The final checkpoint's last completed tick is `scheduler-tick-002`.

Browser smoke evidence:

- Visual QA JSON:
  `docs/evidence/M5/smallville-supervised-scheduler-elapsed-visual-qa.json`.
- Desktop page screenshot:
  `docs/evidence/M5/smallville-supervised-scheduler-elapsed-desktop.png`.
- Desktop canvas screenshot:
  `docs/evidence/M5/smallville-supervised-scheduler-elapsed-desktop-map.png`.
- Mobile page screenshot:
  `docs/evidence/M5/smallville-supervised-scheduler-elapsed-mobile.png`.
- Mobile canvas screenshot:
  `docs/evidence/M5/smallville-supervised-scheduler-elapsed-mobile-map.png`.
- Desktop canvas box: 773.0625 x 669.
- Desktop canvas sample: 338 sampled colors, 17,286 opaque samples.
- Mobile canvas box: 371.984375 x 321.921875.
- Mobile canvas sample: 387 sampled colors, 20,088 opaque samples.
- Both viewports loaded `Social day`, had no horizontal overflow, and recorded
  no console or page errors.

## Scope Truth

- This is supervised elapsed-time control for a bounded scheduler.
- This is not a live-verified OpenAI run.
- This is not a deployed service.
- This is not a multi-user world-memory database.
- This is not yet an unbounded autonomous free-running town.
- Elapsed-time supervision is control-plane state only; it does not enter
  `WorldState`.
- No API key was created, requested, printed, stored, or written.
- Provider credentials still come only from local/server environment.
- No Notion page body was replaced.
- No Linear issue was closed.
- No merge was performed.
- This does not claim final Stanford Smallville parity.

## External Write-Back

Actual writes completed and read back on 2026-07-10:

- GitHub PR: https://github.com/sophistd/agent-town/pull/1
- Notion S15 / M5 runbook page comment:
  `399acb4b-b6e6-81e1-bc12-001d167a2f42`
- Linear MDL-129 acceptance comment:
  `5e1f9788-ef30-49ca-9b26-e75fcba0805c`
- Linear MDL-152 red-check comment:
  `3ffb964a-d63b-4c5f-bd2c-f44af62a1dd3`

Scope truth for write-back:

- GitHub PR body is updated separately after this evidence write-back commit.
- Notion write-back was a page-level comment; no page body was replaced.
- Linear write-back was additive comments; no issue was closed or state-changed.
- No merge was performed.

## Next Session Candidate

Run and evidence a live provider-backed call through the resumable scheduler
using a local/server-side API key, or run a longer observed supervised window
with several pause/resume cycles and memory-continuity checks.
