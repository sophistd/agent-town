# Smallville Autonomous Scheduler Evidence

Date: 2026-07-10

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation adds a bounded Smallville-style scheduler runner.

The previous slice proved a deterministic external runtime stream could emit
canonical event batches into the live `/provider-loop` route. This slice adds a
virtual world clock and explicit phase plan over routine, cognitive, and social
ticks. Each scheduler tick still emits canonical `AgentEvent` batches, posts
them to `/provider-loop`, and lets the local/server file-backed world-memory
store carry memory across ticks.

## Files Changed

- `src/server/smallvilleAutonomousSchedulerRunner.ts`
- `scripts/smallville-autonomous-scheduler.mjs`
- `src/tests/smallville-autonomous-scheduler-runner.test.ts`
- `package.json`
- `README.md`
- `docs/ADAPTER_GUIDE.md`
- `docs/DEMO_SCRIPT.md`
- `docs/EVENT_SCHEMA.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-autonomous-scheduler.md`
- `docs/evidence/M5/smallville-autonomous-scheduler-summary.json`
- `docs/evidence/M5/smallville-autonomous-scheduler-events.jsonl`
- `docs/evidence/M5/smallville-autonomous-scheduler-visual-qa.json`
- `docs/evidence/M5/smallville-autonomous-scheduler-desktop.png`
- `docs/evidence/M5/smallville-autonomous-scheduler-desktop-map.png`
- `docs/evidence/M5/smallville-autonomous-scheduler-mobile.png`
- `docs/evidence/M5/smallville-autonomous-scheduler-mobile-map.png`

## Acceptance Evidence

- `pnpm smallville:scheduler` exists as a package script.
- The scheduler starts a temporary local world-memory server.
- The scheduler uses a bounded phase plan:
  - `morning_routine`
  - `work_coordination`
  - `midday_social`
  - `afternoon_routine`
  - `evening_reflection`
  - `evening_social`
- Each phase emits canonical `AgentEvent` batches with
  `metadata.source: "custom"`.
- Every emitted event includes `metadata.scheduler` with schedule id, tick
  index, phase, phase intent, scenario, virtual clock, original event
  provenance, and stream identity.
- Each tick posts only canonical events to `/provider-loop`.
- Durable memory accumulates across ticks in the local/server file-backed
  world-memory store.
- Without `OPENAI_API_KEY`, the provider is not called and
  `missing_openai_api_key` remains visible in the summary.
- With a mock server-side provider, provider-shaped output returns canonical
  events through the existing parser/quarantine path once per scheduler tick.
- Summary output contains no provider secret.

## Verification

Commands run:

- `pnpm exec vitest run src/tests/smallville-autonomous-scheduler-runner.test.ts`:
  passed, 1 file / 2 tests.
- `pnpm typecheck`: passed.
- Package-script smoke:
  `pnpm smallville:scheduler` with 6 ticks, 10 events per tick,
  `AGENT_TOWN_WORLD_MEMORY_FILE`, `AGENT_TOWN_SCHEDULER_OUTPUT`, and
  `AGENT_TOWN_SCHEDULER_EVENTS_OUTPUT`: passed.
- Browser projection smoke:
  Python Playwright desktop 1440x960 and mobile 390x844: passed.

Smoke output:

- Summary:
  `docs/evidence/M5/smallville-autonomous-scheduler-summary.json`.
- Emitted event log:
  `docs/evidence/M5/smallville-autonomous-scheduler-events.jsonl`.
- Tick count: 6.
- Emitted events: 60.
- Accepted input events: 60.
- Phase counts: one tick each for `morning_routine`, `work_coordination`,
  `midday_social`, `afternoon_routine`, `evening_reflection`, and
  `evening_social`.
- Scenario counts: 2 `routine`, 2 `cognitive`, and 2 `social`.
- Final persisted memory records: 26.
- Recall events across ticks: 93.
- Memory plan events across ticks: 45.
- Provider request records across ticks: 93.
- Provider events: 0 because no local/server API key was configured.
- Warning codes: `persistent_memory_file_missing`, `missing_openai_api_key`.
- Quarantined events: 0.

Cross-tick memory evidence:

- Tick 0 persisted records: 5.
- Tick 1 persisted records: 9.
- Tick 2 persisted records: 13.
- Tick 3 persisted records: 18.
- Tick 4 persisted records: 22.
- Tick 5 persisted records: 26.

This proves memory accumulation across scheduled ticks, not only within a
single batch.

Browser projection smoke:

- Scope: no client UI source changed in this slice; this smoke rechecked that
  the client projection still renders after the server-side scheduler addition.
- Tool path: Python Playwright.
- Desktop 1440x960:
  `docs/evidence/M5/smallville-autonomous-scheduler-desktop.png`.
- Desktop canvas crop:
  `docs/evidence/M5/smallville-autonomous-scheduler-desktop-map.png`.
- Mobile 390x844:
  `docs/evidence/M5/smallville-autonomous-scheduler-mobile.png`.
- Mobile canvas crop:
  `docs/evidence/M5/smallville-autonomous-scheduler-mobile-map.png`.
- QA JSON:
  `docs/evidence/M5/smallville-autonomous-scheduler-visual-qa.json`.
- QA checks passed: `Social day` loaded, no horizontal overflow, nonblank
  varied canvas screenshot, no console errors, and no page errors.

Pixel evidence from the canvas screenshots:

- Desktop canvas crop: 541 sampled colors, 43,262 opaque samples.
- Mobile canvas crop: 651 sampled colors, 60,078 opaque samples.

## Scope Truth

- This is a bounded scheduler runner with an explicit phase plan.
- This is not a live-verified OpenAI run.
- This is not a deployed service.
- This is not a multi-user world-memory database.
- This is not yet an unbounded autonomous free-running town.
- No API key was created, requested, printed, stored, or written.
- Provider credentials still come only from local/server environment.
- No Notion page body was replaced.
- No Linear issue was closed.
- No merge was performed.
- This does not claim final Stanford Smallville parity.

## Next Session Candidate

Run and evidence a live provider-backed planner call through
`pnpm smallville:scheduler` using a local/server-side API key, or extend the
bounded scheduler into a supervised long-running process with pause/resume
evidence and memory-continuity checks.
