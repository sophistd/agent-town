# Smallville Supervised Scheduler Resume Evidence

Date: 2026-07-10

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation extends the bounded scheduler into a supervised resumable
runtime slice.

The scheduler can now write a checkpoint after each completed tick and resume
from that checkpoint in a later process invocation. The checkpoint records
control-plane state only: schedule id, phase plan, tick shape, memory file path,
last completed tick, and `nextTickIndex`. It does not enter replay and does not
own runtime facts.

Accepted facts still enter through:

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
- `docs/evidence/M5/smallville-supervised-scheduler-resume.md`
- `docs/evidence/M5/smallville-supervised-scheduler-checkpoint.json`
- `docs/evidence/M5/smallville-supervised-scheduler-first-summary.json`
- `docs/evidence/M5/smallville-supervised-scheduler-resumed-summary.json`
- `docs/evidence/M5/smallville-supervised-scheduler-first-events.jsonl`
- `docs/evidence/M5/smallville-supervised-scheduler-resumed-events.jsonl`
- `docs/evidence/M5/smallville-supervised-scheduler-visual-qa.json`
- `docs/evidence/M5/smallville-supervised-scheduler-desktop.png`
- `docs/evidence/M5/smallville-supervised-scheduler-desktop-map.png`
- `docs/evidence/M5/smallville-supervised-scheduler-mobile.png`
- `docs/evidence/M5/smallville-supervised-scheduler-mobile-map.png`

## Acceptance Evidence

- `AGENT_TOWN_SCHEDULER_CHECKPOINT` writes a checkpoint after each tick.
- `AGENT_TOWN_SCHEDULER_RESUME=true` resumes from the checkpoint's
  `nextTickIndex`.
- Resume inherits checkpoint schedule settings when explicit env values are not
  supplied.
- Explicit schedule-setting conflicts fail fast instead of silently restarting
  or changing the run shape.
- The resumed run continues event sequence numbers from the checkpointed tick
  index.
- The same file-backed world-memory store accumulates memory across both
  process invocations.
- Without `OPENAI_API_KEY`, the provider is not called and
  `missing_openai_api_key` remains visible.

## Verification

Commands run:

- `pnpm exec vitest run src/tests/smallville-autonomous-scheduler-runner.test.ts`:
  passed, 1 file / 3 tests.
- `pnpm typecheck`: passed.
- Two-stage package-script smoke: passed.
- Browser visual smoke: passed for desktop 1440x960 and mobile 390x844.

First invocation:

```bash
AGENT_TOWN_WORLD_MEMORY_FILE=/tmp/agent-town-supervised-scheduler-memory.json \
AGENT_TOWN_SCHEDULER_CHECKPOINT=docs/evidence/M5/smallville-supervised-scheduler-checkpoint.json \
AGENT_TOWN_SCHEDULER_OUTPUT=docs/evidence/M5/smallville-supervised-scheduler-first-summary.json \
AGENT_TOWN_SCHEDULER_EVENTS_OUTPUT=docs/evidence/M5/smallville-supervised-scheduler-first-events.jsonl \
AGENT_TOWN_SCHEDULER_TICKS=2 \
AGENT_TOWN_SCHEDULER_EVENTS_PER_TICK=10 \
AGENT_TOWN_SCHEDULER_TICK_MINUTES=60 \
AGENT_TOWN_PROVIDER_LOOP_MAX_AGENTS=3 \
AGENT_TOWN_PROVIDER_LOOP_MAX_MEMORY_RECORDS=12 \
pnpm smallville:scheduler
```

Second invocation:

```bash
AGENT_TOWN_WORLD_MEMORY_FILE=/tmp/agent-town-supervised-scheduler-memory.json \
AGENT_TOWN_SCHEDULER_CHECKPOINT=docs/evidence/M5/smallville-supervised-scheduler-checkpoint.json \
AGENT_TOWN_SCHEDULER_RESUME=true \
AGENT_TOWN_SCHEDULER_OUTPUT=docs/evidence/M5/smallville-supervised-scheduler-resumed-summary.json \
AGENT_TOWN_SCHEDULER_EVENTS_OUTPUT=docs/evidence/M5/smallville-supervised-scheduler-resumed-events.jsonl \
AGENT_TOWN_SCHEDULER_TICKS=4 \
AGENT_TOWN_PROVIDER_LOOP_MAX_AGENTS=3 \
AGENT_TOWN_PROVIDER_LOOP_MAX_MEMORY_RECORDS=12 \
pnpm smallville:scheduler
```

First-run smoke output:

- Tick count: 2.
- Start tick index: 0.
- Emitted events: 20.
- Event log lines: 20.
- Final persisted memory records: 9.
- Recall events: 14.
- Memory plan events: 12.
- Provider events: 0 because no local/server API key was configured.
- Checkpoint after first run: `nextTickIndex: 2`.

Resumed-run smoke output:

- Resume requested: true.
- Resumed: true.
- Previous completed tick count: 2.
- Start tick index: 2.
- Tick indexes: 2, 3, 4, 5.
- Emitted events: 40.
- Event log lines: 40.
- First resumed event sequence: 20.
- Final persisted memory records: 26.
- Recall events: 79.
- Memory plan events: 33.
- Provider events: 0 because no local/server API key was configured.
- Final checkpoint: `completedTickCount: 6`, `nextTickIndex: 6`,
  `lastEventSequence: 59`.

Continuity evidence:

- First process ended at tick 1 and wrote `nextTickIndex: 2`.
- Second process started at tick 2 instead of restarting at tick 0.
- Event sequence continued from 20 in the resumed run.
- Persisted memory grew from 9 records after the first invocation to 26 records
  after the resumed invocation.
- The final checkpoint's last completed tick is `scheduler-tick-005`.

Browser smoke evidence:

- Visual QA JSON:
  `docs/evidence/M5/smallville-supervised-scheduler-visual-qa.json`.
- Desktop page screenshot:
  `docs/evidence/M5/smallville-supervised-scheduler-desktop.png`.
- Desktop canvas screenshot:
  `docs/evidence/M5/smallville-supervised-scheduler-desktop-map.png`.
- Mobile page screenshot:
  `docs/evidence/M5/smallville-supervised-scheduler-mobile.png`.
- Mobile canvas screenshot:
  `docs/evidence/M5/smallville-supervised-scheduler-mobile-map.png`.
- Desktop canvas box: 773.0625 x 669.
- Desktop canvas sample: 541 sampled colors, 43,262 opaque samples.
- Mobile canvas box: 371.984375 x 321.921875.
- Mobile canvas sample: 651 sampled colors, 60,078 opaque samples.
- Both viewports loaded `social-day`, had no horizontal overflow, and recorded
  no console or page errors.

## Scope Truth

- This is supervised checkpoint/resume for a bounded scheduler.
- This is not a live-verified OpenAI run.
- This is not a deployed service.
- This is not a multi-user world-memory database.
- This is not yet an unbounded autonomous free-running town.
- Checkpoints are control-plane state only; they do not enter `WorldState`.
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
  `399acb4b-b6e6-8182-8fdd-001d9a6105ff`
- Linear MDL-129 acceptance comment:
  `13b76319-8081-4870-8564-e529f3ef460e`
- Linear MDL-152 red-check comment:
  `6bb82a01-23f4-4fd5-8028-56cb80724428`

Scope truth for write-back:

- GitHub PR body is updated separately after this evidence write-back commit.
- Notion write-back was a page-level comment; no page body was replaced.
- Linear write-back was additive comments; no issue was closed or state-changed.
- No merge was performed.

## Next Session Candidate

Run and evidence a live provider-backed planner call through the resumable
scheduler using a local/server-side API key, or run a longer supervised
scheduler window with elapsed-time, pause/resume, and memory-continuity
evidence.
